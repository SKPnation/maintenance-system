/* eslint-disable require-jsdoc, max-len */

"use strict";

// Pure validation and scheduling rules shared by the callable API.
// Nothing here touches Firestore, so it can be unit tested directly.

const {HttpsError} = require("firebase-functions/v2/https");

const DEFAULT_TIME_ZONE = process.env.SCHEDULE_TIME_ZONE || "America/Chicago";
const MAX_DURATION_HOURS = 24;
const DURATION_STEP_HOURS = 0.25;
const PAST_GRACE_MS = 5 * 60 * 1000;
const MAX_NOTE_LENGTH = 2000;

const CLOSED_STATUSES = ["Completed", "Cancelled"];
const NOTE_KINDS = ["progress", "completion"];

// Technician status workflow (PB-08).
const STATUS_TRANSITIONS = {
  "Assigned": ["In Progress"],
  "In Progress": ["Completed"],
};

// Trades are typed by admins and suggested by AI, so compare loosely:
// "HVAC", "hvac technician" and "HVAC Tech" are the same trade.
const TRADE_ALIASES = {
  "electrician": "electrical",
  "electric": "electrical",
  "plumber": "plumbing",
  "general": "general maintenance",
  "maintenance": "general maintenance",
  "handyman": "general maintenance",
  "heating ventilation and air conditioning": "hvac",
  "air conditioning": "hvac",
};

function normalizeTrade(value) {
  const text = String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\b(technician|technicians|tech|specialist|engineer|worker)\b/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  return TRADE_ALIASES[text] || text;
}

function tradesMatch(a, b) {
  const left = normalizeTrade(a);
  return Boolean(left) && left === normalizeTrade(b);
}

function invalid(message) {
  return new HttpsError("invalid-argument", message);
}

function validateTimeZone(value) {
  const zone = value == null || value === "" ? DEFAULT_TIME_ZONE : value;

  if (typeof zone !== "string" || zone.length > 64) {
    throw invalid("Invalid time zone.");
  }

  try {
    new Intl.DateTimeFormat("en-US", {timeZone: zone});
  } catch (error) {
    throw invalid("Invalid time zone.");
  }

  return zone;
}

// Offset (ms) of the given time zone at a UTC instant.
function zoneOffsetMs(utcMs, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(utcMs));

  const get = (type) => Number(parts.find((p) => p.type === type).value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));

  return asUtc - Math.floor(utcMs / 1000) * 1000;
}

// Convert a wall-clock date and time in a time zone to a UTC instant.
function zonedTimeToUtc(serviceDate, startTime, timeZone) {
  const [year, month, day] = serviceDate.split("-").map(Number);
  const [hour, minute] = startTime.split(":").map(Number);
  const wall = Date.UTC(year, month - 1, day, hour, minute);

  let utc = wall - zoneOffsetMs(wall, timeZone);
  utc = wall - zoneOffsetMs(utc, timeZone);

  return utc;
}

function validateServiceDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw invalid("Select a valid service date.");
  }

  const [year, month, day] = value.split("-").map(Number);
  const check = new Date(Date.UTC(year, month - 1, day));

  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) {
    throw invalid("Select a valid service date.");
  }

  return value;
}

function validateStartTime(value) {
  if (typeof value !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) {
    throw invalid("Select a valid start time.");
  }

  return value;
}

function validateScheduleDuration(value) {
  if (value === null || value === undefined || value === "") {
    throw invalid("Enter an estimated duration.");
  }

  const duration = Number(value);

  if (
    !Number.isFinite(duration) ||
    duration <= 0 ||
    duration > MAX_DURATION_HOURS ||
    Math.abs(duration / DURATION_STEP_HOURS - Math.round(duration / DURATION_STEP_HOURS)) > 1e-9
  ) {
    throw invalid(`Duration must be between 0.25 and ${MAX_DURATION_HOURS} hours, in 15-minute steps.`);
  }

  return duration;
}

// Validate a schedule request and resolve it to UTC start/end instants.
function parseSchedule(input, nowMs = Date.now()) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw invalid("Schedule details are required.");
  }

  const serviceDate = validateServiceDate(input.serviceDate);
  const startTime = validateStartTime(input.startTime);
  const durationHours = validateScheduleDuration(input.durationHours);
  const timeZone = validateTimeZone(input.timeZone);

  const startMs = zonedTimeToUtc(serviceDate, startTime, timeZone);

  if (!Number.isFinite(startMs)) {
    throw invalid("Select a valid service date and start time.");
  }

  if (startMs < nowMs - PAST_GRACE_MS) {
    throw invalid("The service time must be in the future.");
  }

  const endMs = startMs + durationHours * 3600000;

  return {
    serviceDate,
    startTime,
    durationHours,
    timeZone,
    scheduledAt: new Date(startMs).toISOString(),
    scheduledEnd: new Date(endMs).toISOString(),
    startMs,
    endMs,
  };
}

function orderWindow(order) {
  if (!order || !order.scheduledAt) return null;

  const start = Date.parse(order.scheduledAt);
  const duration = Number(order.durationHours);

  if (!Number.isFinite(start) || !Number.isFinite(duration) || duration <= 0) {
    return null;
  }

  const end = order.scheduledEnd ? Date.parse(order.scheduledEnd) : start + duration * 3600000;

  return {start, end: Number.isFinite(end) ? end : start + duration * 3600000};
}

// Find another open work order for the same technician whose window overlaps.
// Back-to-back slots (one ends exactly when the next starts) do not conflict.
function findScheduleConflict(orders, {technicianId, startMs, endMs, excludeId}) {
  for (const order of orders) {
    if (!order || order.id === excludeId) continue;
    if (order.technicianId !== technicianId) continue;
    if (CLOSED_STATUSES.includes(order.status)) continue;

    const window = orderWindow(order);

    if (window && startMs < window.end && endMs > window.start) {
      return {id: order.id, title: order.title || "", start: window.start, end: window.end};
    }
  }

  return null;
}

function scheduleSnapshot(source) {
  if (!source || !source.scheduledAt) return null;

  return {
    serviceDate: source.serviceDate || "",
    startTime: source.startTime || "",
    durationHours: Number(source.durationHours) || 0,
    timeZone: source.timeZone || "",
    scheduledAt: source.scheduledAt,
    scheduledEnd: source.scheduledEnd || "",
  };
}

function sameSchedule(order, schedule) {
  return Boolean(order && order.scheduledAt) &&
    Date.parse(order.scheduledAt) === schedule.startMs &&
    Number(order.durationHours) === schedule.durationHours;
}

function validateStatusTransition(current, next) {
  if (typeof next !== "string" || !Object.values(STATUS_TRANSITIONS).flat().includes(next)) {
    throw invalid("Unsupported work-order status.");
  }

  const allowed = STATUS_TRANSITIONS[current] || [];

  if (!allowed.includes(next)) {
    throw new HttpsError(
        "failed-precondition",
        `A work order that is ${current || "unassigned"} cannot move to ${next}.`,
    );
  }

  return next;
}

function validateNote(text, kind) {
  if (typeof text !== "string" || !text.trim()) {
    throw invalid("Enter a note before saving.");
  }

  const trimmed = text.trim();

  if (trimmed.length > MAX_NOTE_LENGTH) {
    throw invalid(`Notes are limited to ${MAX_NOTE_LENGTH} characters.`);
  }

  const noteKind = kind == null || kind === "" ? "progress" : kind;

  if (!NOTE_KINDS.includes(noteKind)) {
    throw invalid("Note type must be progress or completion.");
  }

  return {text: trimmed, kind: noteKind};
}

function describeWindow(startMs, endMs, timeZone) {
  const format = new Intl.DateTimeFormat("en-US", {
    timeZone: timeZone || DEFAULT_TIME_ZONE,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  const time = new Intl.DateTimeFormat("en-US", {
    timeZone: timeZone || DEFAULT_TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
  });

  return `${format.format(new Date(startMs))}–${time.format(new Date(endMs))}`;
}

module.exports = {
  CLOSED_STATUSES,
  DEFAULT_TIME_ZONE,
  NOTE_KINDS,
  STATUS_TRANSITIONS,
  describeWindow,
  findScheduleConflict,
  normalizeTrade,
  parseSchedule,
  sameSchedule,
  scheduleSnapshot,
  tradesMatch,
  validateNote,
  validateStatusTransition,
  zonedTimeToUtc,
};
