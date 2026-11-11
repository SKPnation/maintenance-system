/* eslint-disable require-jsdoc, max-len */

"use strict";

// Priority levels: defaults, validation and helpers. Pure - no Firestore.

const {HttpsError} = require("firebase-functions/v2/https");

const UNITS = ["minutes", "hours", "business days"];
const COLOR = /^#[0-9a-fA-F]{6}$/;

// Used until an administrator saves levels to the database.
const DEFAULT_PRIORITY_LEVELS = [
  {id: "critical", rank: 1, name: "Critical", color: "#EF4444", description: "Immediate threat to life, safety, property, or essential operations.", response: {value: 0, unit: "minutes", label: "Immediate (0 – 15 minutes)"}, resolution: {value: 4, unit: "hours"}, active: true},
  {id: "high", rank: 2, name: "High", color: "#F97316", description: "Serious issue requiring rapid attention. Significant impact to operations.", response: {value: 1, unit: "hours"}, resolution: {value: 8, unit: "hours"}, active: true},
  {id: "medium", rank: 3, name: "Medium", color: "#FBBF24", description: "Operational issue without immediate danger. Affects normal operations but not critical.", response: {value: 4, unit: "hours"}, resolution: {value: 3, unit: "business days"}, active: true},
  {id: "low", rank: 4, name: "Low", color: "#22A954", description: "Minor or non-urgent maintenance issue. Little to no impact on operations.", response: {value: 1, unit: "business days"}, resolution: {value: 5, unit: "business days"}, active: true},
];

function invalid(message) {
  return new HttpsError("invalid-argument", message);
}

const sameName = (a, b) => String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();

function validateTarget(value, field, {allowZero}) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw invalid(`Enter a ${field}.`);
  }

  const amount = Number(value.value);

  if (!Number.isFinite(amount) || amount < 0 || (!allowZero && amount === 0) || amount > 10000) {
    throw invalid(`Enter a valid ${field}.`);
  }

  if (!UNITS.includes(value.unit)) {
    throw invalid(`${field[0].toUpperCase()}${field.slice(1)} unit must be minutes, hours or business days.`);
  }

  const out = {value: amount, unit: value.unit};

  if (typeof value.label === "string" && value.label.trim()) {
    out.label = value.label.trim().slice(0, 60);
  }

  return out;
}

// Validate one level from the admin form. Returns the fields to store.
function validateLevel(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw invalid("Priority level details are required.");
  }

  const name = typeof input.name === "string" ? input.name.trim() : "";

  if (!name || name.length > 40) {
    throw invalid("Enter a priority name of up to 40 characters.");
  }

  const description = typeof input.description === "string" ? input.description.trim() : "";

  if (!description || description.length > 500) {
    throw invalid("Describe when this priority applies (up to 500 characters).");
  }

  if (typeof input.color !== "string" || !COLOR.test(input.color)) {
    throw invalid("Pick a valid color.");
  }

  if (typeof input.active !== "boolean") {
    throw invalid("Status must be active or inactive.");
  }

  return {
    name,
    normalizedName: name.toLowerCase(),
    description,
    color: input.color.toUpperCase(),
    response: validateTarget(input.response, "target response time", {allowZero: true}),
    resolution: validateTarget(input.resolution, "target resolution time", {allowZero: false}),
    active: input.active,
  };
}

function byRank(a, b) {
  return (Number(a.rank) || 999) - (Number(b.rank) || 999) || String(a.name).localeCompare(String(b.name));
}

function activeLevels(levels) {
  return levels.filter((level) => level.active === true).sort(byRank);
}

// Accept a priority only if it names an active level; returns its canonical name.
function validatePriorityName(value, levels) {
  const match = activeLevels(levels).find((level) => sameName(level.name, value));

  if (!match) {
    throw invalid(`Priority must be one of: ${activeLevels(levels).map((l) => l.name).join(", ")}.`);
  }

  return match.name;
}

// Map an AI suggestion onto an active level, falling back to the middle one.
function pickPriority(value, levels) {
  const active = activeLevels(levels);
  const match = active.find((level) => sameName(level.name, value));

  if (match) return match.name;

  const medium = active.find((level) => sameName(level.name, "Medium"));

  if (medium) return medium.name;

  return active.length ? active[Math.floor((active.length - 1) / 2)].name : "Medium";
}

function describeTarget(target) {
  if (!target) return "n/a";
  if (target.label) return target.label;
  if (target.value === 0) return "immediate";
  return `${target.value} ${target.value === 1 ? target.unit.replace(/s$/, "") : target.unit}`;
}

// Text given to the AI so it classifies with the organization's own levels.
function priorityPrompt(levels) {
  const active = activeLevels(levels);

  return "Priority must be exactly one of these names, listed from most to least urgent: " +
    active.map((level) => `"${level.name}" (${level.description} Respond: ${describeTarget(level.response)}; resolve: ${describeTarget(level.resolution)}.)`).join(" ") +
    " ";
}

module.exports = {
  DEFAULT_PRIORITY_LEVELS,
  activeLevels,
  byRank,
  pickPriority,
  priorityPrompt,
  sameName,
  validateLevel,
  validatePriorityName,
};
