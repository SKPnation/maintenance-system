/* eslint-disable require-jsdoc, max-len */

"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const {FakeFirestore, FieldValue} = require("./fake-firestore");

// Swap firebase-admin for the in-memory fake before loading the functions.
const db = new FakeFirestore();
const stub = (name, exports) => {
  const file = require.resolve(name, {paths: [path.join(__dirname, "..")]});
  require.cache[file] = {id: file, filename: file, loaded: true, exports};
};
stub("firebase-admin/app", {initializeApp: () => ({})});
stub("firebase-admin/auth", {getAuth: () => ({})});
stub("firebase-admin/firestore", {getFirestore: () => db, FieldValue});

const {maintenanceApi} = require("../index");

const call = (uid, action, payload) => maintenanceApi.run({auth: uid ? {uid} : null, data: {action, payload}});
const rejects = (promise, code, pattern) => assert.rejects(promise, (error) => error.code === code && (!pattern || pattern.test(error.message)));

const FUTURE = "2026-12-01";
const sched = (id, overrides = {}) => ({id, serviceDate: FUTURE, startTime: "09:00", durationHours: 2, timeZone: "America/Chicago", ...overrides});

function seed() {
  db.store.clear();
  const users = {
    mgr: {role: "manager", category: "HVAC", name: "Erin"},
    mgrOther: {role: "manager", category: "Electrical", name: "Omar"},
    tech: {role: "technician", trade: "HVAC Technician", name: "James"},
    tech2: {role: "technician", trade: "HVAC Technician", name: "Priya"},
    techOff: {role: "technician", trade: "HVAC Technician", name: "Gone", active: false},
    req: {role: "requester", name: "Alex"},
    req2: {role: "requester", name: "Sam"},
    admin: {role: "admin", name: "Admin"},
  };
  for (const [uid, data] of Object.entries(users)) db.seed(`users/${uid}`, {active: true, ...data});

  const wo = (id, data) => db.seed(`workOrders/${id}`, {
    title: id, category: "HVAC", trade: "HVAC Technician", status: "Assigned",
    technicianId: "tech", scheduledAt: null, durationHours: null, requestId: `r-${id}`, ...data,
  });
  wo("wo1", {});
  wo("wo2", {});
  wo("woUnassigned", {technicianId: "", status: "Unassigned"});
  wo("woDone", {status: "Completed"});
  wo("woElec", {category: "Electrical"});
  for (const id of ["wo1", "wo2", "woUnassigned", "woDone", "woElec"]) {
    db.seed(`requests/r-${id}`, {requesterId: "req", status: "Approved", history: []});
  }
}

test.beforeEach(seed);

// ---------------- PB-06 scheduling ----------------

test("manager schedules an assigned work order; request mirrors it and history is recorded", async () => {
  const result = await call("mgr", "scheduleWorkOrder", sched("wo1"));
  assert.equal(result.action, "scheduled");

  const wo = db.read("workOrders/wo1");
  assert.equal(wo.scheduledAt, "2026-12-01T15:00:00.000Z");
  assert.equal(wo.scheduledEnd, "2026-12-01T17:00:00.000Z");
  assert.equal(wo.serviceDate, FUTURE);
  assert.equal(wo.startTime, "09:00");
  assert.equal(wo.durationHours, 2);
  assert.equal(wo.status, "Assigned");

  const req = db.read("requests/r-wo1");
  assert.equal(req.serviceScheduledAt, wo.scheduledAt);
  assert.equal(req.history.at(-1).type, "scheduled");

  const {entries} = await call("mgr", "listScheduleHistory", {id: "wo1"});
  assert.equal(entries.length, 1);
  assert.equal(entries[0].previous, null);
  assert.equal(entries[0].next.scheduledAt, wo.scheduledAt);
});

test("rescheduling records previous and new schedule", async () => {
  await call("mgr", "scheduleWorkOrder", sched("wo1"));
  const result = await call("mgr", "scheduleWorkOrder", sched("wo1", {startTime: "13:30", durationHours: 1.5, reason: "Parts delayed"}));
  assert.equal(result.action, "rescheduled");

  const {entries} = await call("tech", "listScheduleHistory", {id: "wo1"});
  assert.equal(entries.length, 2);
  assert.equal(entries[1].previous.scheduledAt, "2026-12-01T15:00:00.000Z");
  assert.equal(entries[1].next.scheduledAt, "2026-12-01T19:30:00.000Z");
  assert.equal(entries[1].reason, "Parts delayed");
  assert.equal(db.read("requests/r-wo1").serviceScheduledAt, "2026-12-01T19:30:00.000Z");
});

test("saving the same schedule again does not add history", async () => {
  await call("mgr", "scheduleWorkOrder", sched("wo1"));
  const result = await call("mgr", "scheduleWorkOrder", sched("wo1"));
  assert.equal(result.unchanged, true);
  assert.equal((await call("mgr", "listScheduleHistory", {id: "wo1"})).entries.length, 1);
});

test("overlap anywhere in the estimated duration is rejected and the existing schedule kept", async () => {
  await call("mgr", "scheduleWorkOrder", sched("wo1", {startTime: "09:00", durationHours: 3})); // 9–12
  await call("mgr", "scheduleWorkOrder", sched("wo2", {startTime: "13:00", durationHours: 1}));

  await rejects(call("mgr", "scheduleWorkOrder", sched("wo2", {startTime: "11:45", durationHours: 1})), "failed-precondition", /already has work scheduled/);
  await rejects(call("mgr", "scheduleWorkOrder", sched("wo2", {startTime: "07:00", durationHours: 6})), "failed-precondition");

  assert.equal(db.read("workOrders/wo2").scheduledAt, "2026-12-01T19:00:00.000Z");
  assert.equal((await call("mgr", "listScheduleHistory", {id: "wo2"})).entries.length, 1);

  // Back-to-back is fine.
  await call("mgr", "scheduleWorkOrder", sched("wo2", {startTime: "12:00", durationHours: 1}));
});

test("invalid or missing schedule details are rejected without changes", async () => {
  await call("mgr", "scheduleWorkOrder", sched("wo1"));
  const before = db.read("workOrders/wo1").scheduledAt;
  for (const bad of [{serviceDate: ""}, {startTime: "9am"}, {durationHours: 0}, {durationHours: ""}, {serviceDate: "2020-01-01"}]) {
    await rejects(call("mgr", "scheduleWorkOrder", sched("wo1", bad)), "invalid-argument");
  }
  assert.equal(db.read("workOrders/wo1").scheduledAt, before);
});

test("unauthorized users cannot schedule", async () => {
  await rejects(call(null, "scheduleWorkOrder", sched("wo1")), "unauthenticated");
  for (const uid of ["tech", "req", "admin"]) {
    await rejects(call(uid, "scheduleWorkOrder", sched("wo1")), "permission-denied");
  }
  await rejects(call("mgrOther", "scheduleWorkOrder", sched("wo1")), "permission-denied");
  assert.equal(db.read("workOrders/wo1").scheduledAt, null);
});

test("unassigned and closed work orders cannot be scheduled", async () => {
  await rejects(call("mgr", "scheduleWorkOrder", sched("woUnassigned")), "failed-precondition", /Assign a technician/);
  await rejects(call("mgr", "scheduleWorkOrder", sched("woDone")), "failed-precondition");
});

test("reassigning a scheduled job to a busy technician is rejected", async () => {
  db.seed("workOrders/woT2", {title: "x", category: "HVAC", trade: "HVAC Technician", status: "Assigned", technicianId: "tech2", scheduledAt: "2026-12-01T16:00:00.000Z", durationHours: 1});
  await call("mgr", "scheduleWorkOrder", sched("wo1"));
  await rejects(call("mgr", "assignTechnician", {id: "wo1", technicianId: "tech2"}), "failed-precondition");
  assert.equal(db.read("workOrders/wo1").technicianId, "tech");
});

test("schedule history is hidden from requesters and other categories", async () => {
  await call("mgr", "scheduleWorkOrder", sched("wo1"));
  for (const uid of ["req", "mgrOther", "tech2"]) {
    await rejects(call(uid, "listScheduleHistory", {id: "wo1"}), "permission-denied");
  }
});

// ---------------- PB-08 status ----------------

test("assigned technician moves Assigned → In Progress → Completed", async () => {
  await call("tech", "updateWorkOrderStatus", {id: "wo1", status: "In Progress"});
  let wo = db.read("workOrders/wo1");
  assert.equal(wo.status, "In Progress");
  assert.ok(wo.statusUpdatedAt);

  await call("tech", "updateWorkOrderStatus", {id: "wo1", status: "Completed"});
  wo = db.read("workOrders/wo1");
  assert.equal(wo.status, "Completed");
  assert.ok(wo.completedAt);

  const req = db.read("requests/r-wo1");
  assert.equal(req.workOrderStatus, "Completed");
  assert.equal(req.status, "Approved", "request status stays separate");
});

test("invalid transitions and other technicians are rejected", async () => {
  await rejects(call("tech", "updateWorkOrderStatus", {id: "wo1", status: "Completed"}), "failed-precondition");
  await rejects(call("tech", "updateWorkOrderStatus", {id: "wo1", status: "On Hold"}), "invalid-argument");
  await rejects(call("tech2", "updateWorkOrderStatus", {id: "wo1", status: "In Progress"}), "permission-denied");
  await rejects(call("mgr", "updateWorkOrderStatus", {id: "wo1", status: "In Progress"}), "permission-denied");
  await rejects(call("techOff", "updateWorkOrderStatus", {id: "wo1", status: "In Progress"}), "permission-denied");
  assert.equal(db.read("workOrders/wo1").status, "Assigned");
});

// ---------------- PB-09 notes ----------------

test("technician notes are stored with author and time, listed in order", async () => {
  await call("tech", "addWorkOrderNote", {id: "wo1", text: "Started inspection.", kind: "progress"});
  await call("tech", "addWorkOrderNote", {id: "wo1", text: "Replaced capacitor; unit cooling.", kind: "completion"});

  const {notes} = await call("tech", "listWorkOrderNotes", {id: "wo1"});
  assert.deepEqual(notes.map((n) => n.text), ["Started inspection.", "Replaced capacitor; unit cooling."]);
  assert.equal(notes[0].authorId, "tech");
  assert.equal(notes[0].authorName, "James");
  assert.ok(notes[0].createdAt < notes[1].createdAt);
  assert.equal(notes[1].kind, "completion");
  assert.equal(db.read("workOrders/wo1").noteCount, 2);

  const managerView = await call("mgr", "listWorkOrderNotes", {id: "wo1"});
  assert.equal(managerView.notes.length, 2);
});

test("empty notes and users without access are rejected; requesters never see notes", async () => {
  await rejects(call("tech", "addWorkOrderNote", {id: "wo1", text: "   "}), "invalid-argument");
  await rejects(call("tech2", "addWorkOrderNote", {id: "wo1", text: "hi"}), "permission-denied");
  await rejects(call("mgr", "addWorkOrderNote", {id: "wo1", text: "hi"}), "permission-denied");
  await rejects(call("req", "addWorkOrderNote", {id: "wo1", text: "hi"}), "permission-denied");

  await call("tech", "addWorkOrderNote", {id: "wo1", text: "Internal only"});
  for (const uid of ["req", "tech2", "mgrOther", "admin"]) {
    await rejects(call(uid, "listWorkOrderNotes", {id: "wo1"}), "permission-denied");
  }
  assert.ok(!JSON.stringify(db.read("requests/r-wo1")).includes("Internal only"));
});

// ---------------- PB-10 requester data ----------------

test("request carries requester-safe progress, schedule and history", async () => {
  await call("mgr", "scheduleWorkOrder", sched("wo1"));
  await call("tech", "updateWorkOrderStatus", {id: "wo1", status: "In Progress"});
  await call("tech", "addWorkOrderNote", {id: "wo1", text: "Secret technician detail"});

  const req = db.read("requests/r-wo1");
  assert.equal(req.workOrderStatus, "In Progress");
  assert.equal(req.serviceScheduledAt, "2026-12-01T15:00:00.000Z");
  assert.equal(req.serviceDurationHours, 2);
  assert.deepEqual(req.history.map((h) => h.type), ["scheduled", "work_status"]);
  assert.ok(!JSON.stringify(req).includes("Secret"));
});

test("assignment accepts equivalent trade wording and explains real mismatches", async () => {
  db.seed("users/techShort", {active: true, role: "technician", trade: "HVAC", name: "Usman"});
  db.seed("users/sparky", {active: true, role: "technician", trade: "Electrician", name: "Sparky"});
  db.seed("workOrders/woOpen", {title: "x", category: "HVAC", trade: "HVAC Technician", status: "Unassigned", technicianId: ""});

  await call("mgr", "assignTechnician", {id: "woOpen", technicianId: "techShort"});
  assert.equal(db.read("workOrders/woOpen").technicianId, "techShort");

  await rejects(call("mgr", "assignTechnician", {id: "woOpen", technicianId: "sparky"}), "invalid-argument", /Sparky's trade \(Electrician\) does not match/);
  await rejects(call("mgr", "assignTechnician", {id: "woOpen", technicianId: "techOff"}), "invalid-argument", /active technician/);
});
