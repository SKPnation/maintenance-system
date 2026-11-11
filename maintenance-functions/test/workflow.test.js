/* eslint-disable require-jsdoc, max-len */

"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const workflow = require("../workflow");

const NOW = Date.parse("2026-11-11T16:00:00Z");

function schedule(overrides = {}) {
  return workflow.parseSchedule({
    serviceDate: "2026-11-12",
    startTime: "09:00",
    durationHours: 2,
    timeZone: "America/Chicago",
    ...overrides,
  }, NOW);
}

test("parseSchedule resolves wall-clock time in the given zone", () => {
  const s = schedule();
  assert.equal(s.scheduledAt, "2026-11-12T15:00:00.000Z");
  assert.equal(s.scheduledEnd, "2026-11-12T17:00:00.000Z");
  assert.equal(s.durationHours, 2);
});

test("parseSchedule handles daylight saving boundaries", () => {
  const summer = workflow.parseSchedule({
    serviceDate: "2027-07-01", startTime: "09:00", durationHours: 1, timeZone: "America/Chicago",
  }, NOW);
  assert.equal(summer.scheduledAt, "2027-07-01T14:00:00.000Z");
});

test("parseSchedule rejects missing or invalid details", () => {
  const bad = [
    {serviceDate: ""},
    {serviceDate: "2026-02-30"},
    {serviceDate: "12/11/2026"},
    {startTime: ""},
    {startTime: "25:00"},
    {durationHours: ""},
    {durationHours: 0},
    {durationHours: -1},
    {durationHours: 25},
    {durationHours: 1.1},
    {durationHours: "abc"},
    {timeZone: "Mars/Olympus"},
  ];

  for (const overrides of bad) {
    assert.throws(() => schedule(overrides), (error) => error.code === "invalid-argument", JSON.stringify(overrides));
  }

  assert.throws(() => workflow.parseSchedule(null, NOW), (error) => error.code === "invalid-argument");
});

test("parseSchedule rejects times in the past", () => {
  assert.throws(
      () => schedule({serviceDate: "2026-11-10"}),
      (error) => error.code === "invalid-argument" && /future/.test(error.message),
  );
});

test("parseSchedule accepts quarter-hour durations", () => {
  assert.equal(schedule({durationHours: "1.25"}).durationHours, 1.25);
});

test("findScheduleConflict detects overlap across the full duration", () => {
  const orders = [
    {id: "a", technicianId: "t1", status: "Assigned", scheduledAt: "2026-11-12T15:00:00.000Z", durationHours: 3},
  ];
  const s = schedule({startTime: "11:00", durationHours: 1}); // 17:00Z–18:00Z, overlaps 15–18Z
  const conflict = workflow.findScheduleConflict(orders, {technicianId: "t1", startMs: s.startMs, endMs: s.endMs, excludeId: "b"});
  assert.equal(conflict.id, "a");
});

test("findScheduleConflict allows back-to-back slots", () => {
  const orders = [
    {id: "a", technicianId: "t1", status: "Assigned", scheduledAt: "2026-11-12T15:00:00.000Z", durationHours: 2},
  ];
  const s = schedule({startTime: "11:00"}); // starts exactly when "a" ends
  assert.equal(workflow.findScheduleConflict(orders, {technicianId: "t1", startMs: s.startMs, endMs: s.endMs}), null);
});

test("findScheduleConflict ignores the same order, other technicians, closed and unscheduled work", () => {
  const s = schedule();
  const orders = [
    {id: "self", technicianId: "t1", status: "Assigned", scheduledAt: s.scheduledAt, durationHours: 2},
    {id: "other", technicianId: "t2", status: "Assigned", scheduledAt: s.scheduledAt, durationHours: 2},
    {id: "done", technicianId: "t1", status: "Completed", scheduledAt: s.scheduledAt, durationHours: 2},
    {id: "cancelled", technicianId: "t1", status: "Cancelled", scheduledAt: s.scheduledAt, durationHours: 2},
    {id: "unscheduled", technicianId: "t1", status: "Assigned", scheduledAt: null, durationHours: null},
  ];
  assert.equal(workflow.findScheduleConflict(orders, {technicianId: "t1", startMs: s.startMs, endMs: s.endMs, excludeId: "self"}), null);
});

test("findScheduleConflict catches a new job that swallows an existing one", () => {
  const orders = [
    {id: "short", technicianId: "t1", status: "In Progress", scheduledAt: "2026-11-12T16:00:00.000Z", durationHours: 0.5},
  ];
  const s = schedule({durationHours: 4});
  assert.equal(workflow.findScheduleConflict(orders, {technicianId: "t1", startMs: s.startMs, endMs: s.endMs}).id, "short");
});

test("sameSchedule detects an unchanged reschedule", () => {
  const s = schedule();
  assert.equal(workflow.sameSchedule({scheduledAt: s.scheduledAt, durationHours: 2}, s), true);
  assert.equal(workflow.sameSchedule({scheduledAt: s.scheduledAt, durationHours: 3}, s), false);
  assert.equal(workflow.sameSchedule({scheduledAt: null}, s), false);
});

test("status transitions follow Assigned → In Progress → Completed", () => {
  assert.equal(workflow.validateStatusTransition("Assigned", "In Progress"), "In Progress");
  assert.equal(workflow.validateStatusTransition("In Progress", "Completed"), "Completed");

  const rejected = [
    ["Assigned", "Completed"],
    ["Completed", "In Progress"],
    ["Unassigned", "In Progress"],
    ["In Progress", "In Progress"],
  ];
  for (const [from, to] of rejected) {
    assert.throws(() => workflow.validateStatusTransition(from, to), (error) => error.code === "failed-precondition", `${from}→${to}`);
  }

  assert.throws(() => workflow.validateStatusTransition("Assigned", "Assigned"), (error) => error.code === "invalid-argument");
  assert.throws(() => workflow.validateStatusTransition("Assigned", "On Hold"), (error) => error.code === "invalid-argument");
});

test("validateNote trims text and defaults to a progress note", () => {
  assert.deepEqual(workflow.validateNote("  Replaced filter.  "), {text: "Replaced filter.", kind: "progress"});
  assert.deepEqual(workflow.validateNote("Fixed", "completion"), {text: "Fixed", kind: "completion"});
});

test("validateNote rejects empty, oversized or unknown notes", () => {
  for (const [text, kind] of [["", "progress"], ["   ", "progress"], [null, "progress"], ["x".repeat(2001), "progress"], ["ok", "secret"]]) {
    assert.throws(() => workflow.validateNote(text, kind), (error) => error.code === "invalid-argument");
  }
});
