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

// ---------------- Priority levels ----------------

const DEMO_LEVELS = require("../priorities").DEFAULT_PRIORITY_LEVELS.map(({id, rank, ...level}) => level);
const pendingRequest = (id, extra = {}) => db.seed(`requests/${id}`, {requesterId: "req", status: "submitted", analysisStatus: "completed", routedCategory: "HVAC", priority: "Medium", ...extra});

test("before any levels are saved, the built-in defaults apply", async () => {
  pendingRequest("p1");
  await call("mgr", "updateRequest", {id: "p1", changes: {priority: "High"}});
  assert.equal(db.read("requests/p1").priority, "High");
  await rejects(call("mgr", "updateRequest", {id: "p1", changes: {priority: "Urgent"}}), "invalid-argument", /Priority must be one of/);
});

test("admin imports the demo levels once; others cannot", async () => {
  await rejects(call("mgr", "importPriorityLevels", {levels: DEMO_LEVELS}), "permission-denied");
  await rejects(call("admin", "savePriorityLevel", {...DEMO_LEVELS[0]}), "failed-precondition", /first/);

  const result = await call("admin", "importPriorityLevels", {levels: DEMO_LEVELS});
  assert.equal(result.count, 4);
  const saved = [...db.store.entries()].filter(([k]) => k.startsWith("priorityLevels/")).map(([, v]) => v);
  assert.deepEqual(saved.sort((a, b) => a.rank - b.rank).map((l) => l.name), ["Critical", "High", "Medium", "Low"]);

  await rejects(call("admin", "importPriorityLevels", {levels: DEMO_LEVELS}), "failed-precondition", /already saved/);
});

test("saved levels drive validation: new levels allowed, inactive ones rejected", async () => {
  await call("admin", "importPriorityLevels", {levels: DEMO_LEVELS});
  const {id} = await call("admin", "savePriorityLevel", {name: "Urgent", color: "#7C3AED", description: "Needs action today.", response: {value: 2, unit: "hours"}, resolution: {value: 1, unit: "business days"}, active: true});
  assert.equal(db.read(`priorityLevels/${id}`).rank, 5);

  pendingRequest("p2");
  await call("mgr", "updateRequest", {id: "p2", changes: {priority: "urgent"}});
  assert.equal(db.read("requests/p2").priority, "Urgent", "stored with the canonical name");

  const lowId = [...db.store.entries()].find(([k, v]) => k.startsWith("priorityLevels/") && v.name === "Low")[0].split("/")[1];
  await call("admin", "savePriorityLevel", {...DEMO_LEVELS[3], id: lowId, active: false});
  await rejects(call("mgr", "updateRequest", {id: "p2", changes: {priority: "Low"}}), "invalid-argument");
});

test("level rules: unique names, valid targets, one must stay active, used levels can't be renamed or deleted", async () => {
  await call("admin", "importPriorityLevels", {levels: DEMO_LEVELS});
  const levelId = (name) => [...db.store.entries()].find(([k, v]) => k.startsWith("priorityLevels/") && v.name === name)[0].split("/")[1];

  await rejects(call("admin", "savePriorityLevel", {...DEMO_LEVELS[0], name: "high"}), "already-exists");
  await rejects(call("admin", "savePriorityLevel", {...DEMO_LEVELS[0], name: "X", resolution: {value: 0, unit: "hours"}}), "invalid-argument");
  await rejects(call("admin", "savePriorityLevel", {...DEMO_LEVELS[0], name: "X", color: "red"}), "invalid-argument");

  // wo1 etc. are seeded without priority; give one a "High" priority.
  db.seed("workOrders/woHigh", {title: "x", category: "HVAC", priority: "High", status: "Assigned"});
  await rejects(call("admin", "savePriorityLevel", {...DEMO_LEVELS[1], id: levelId("High"), name: "Very High"}), "failed-precondition", /can't be renamed/);
  await rejects(call("admin", "deletePriorityLevel", {id: levelId("High")}), "failed-precondition", /inactive instead/);

  // Unused level: rename and delete are fine.
  await call("admin", "savePriorityLevel", {...DEMO_LEVELS[3], id: levelId("Low"), name: "Routine"});
  await call("admin", "deletePriorityLevel", {id: levelId("Routine")});

  for (const name of ["Critical", "Medium"]) await call("admin", "deletePriorityLevel", {id: levelId(name)});
  await rejects(call("admin", "savePriorityLevel", {...DEMO_LEVELS[1], id: levelId("High"), active: false}), "failed-precondition", /stay active/);
});

// ---------------- PB-13 routing ----------------

const routingDefaults = () => [
  {name: "Appliance/Equipment", description: "", active: true, managerId: "mgrAppliance"},
  {name: "Electrical", description: "", active: true, managerId: "mgrElec"},
  {name: "HVAC", description: "", active: true, managerId: "mgrElec"},
  {name: "Information Technology", description: "", active: true, managerId: "mgrIT"},
  {name: "General Maintenance", description: "", active: true, managerId: ""},
];
const seedRoutingManagers = () => {
  for (const [uid, name] of [["mgrAppliance", "Appliance Manager"], ["mgrElec", "Electrical Category Manager"], ["mgrIT", "IT Manager"]]) {
    db.seed(`users/${uid}`, {active: true, role: "manager", name, category: ""});
  }
};
const catId = (name) => [...db.store.entries()].find(([k, v]) => k.startsWith("categories/") && v.name === name)[0].split("/")[1];

test("routing lookup: matched, unknown, inactive and unmapped categories", () => {
  const routing = require("../routing");
  const cats = [...routingDefaults(), {name: "Plumbing", active: false, managerId: "x"}, {name: "Grounds", active: true, managerId: ""}];
  assert.deepEqual(routing.resolveRoute("hvac", cats), {category: "HVAC", managerId: "mgrElec", fallback: false, reason: "matched"});
  assert.equal(routing.resolveRoute("Electronics", cats).category, "General Maintenance");
  assert.equal(routing.resolveRoute("Electronics", cats).reason, "unknown");
  assert.equal(routing.resolveRoute("Plumbing", cats).reason, "inactive");
  assert.equal(routing.resolveRoute("Grounds", cats).reason, "unmapped");
  assert.equal(routing.resolveRoute("Grounds", cats).managerId, null, "unmapped GM -> manual review");
});

test("only admins set up routing; setup routes existing records and runs once", async () => {
  seedRoutingManagers();
  db.seed("requests/old", {requesterId: "req", status: "submitted", analysisStatus: "completed", routedCategory: "Plumbing"});
  db.seed("requests/hvacOld", {requesterId: "req", status: "Approved", analysisStatus: "completed", routedCategory: "HVAC", workOrderId: "wo1"});

  await rejects(call("mgr", "importRouting", {categories: routingDefaults()}), "permission-denied");
  await rejects(call("admin", "importRouting", {categories: routingDefaults().slice(0, 4)}), "invalid-argument", /General Maintenance/);
  await rejects(call("admin", "importRouting", {categories: [...routingDefaults().slice(0, 4), {name: "General Maintenance", active: true, managerId: "tech"}]}), "invalid-argument", /active Category Manager/);

  const result = await call("admin", "importRouting", {categories: routingDefaults()});
  assert.equal(result.count, 5);
  assert.ok(db.read("settings/routing"));

  // Pending unknown category moves to General Maintenance; approved HVAC keeps its category, gets the Electrical manager.
  assert.equal(db.read("requests/old").routedCategory, "General Maintenance");
  assert.equal(db.read("requests/old").routedManagerId, null);
  assert.equal(db.read("requests/hvacOld").routedManagerId, "mgrElec");
  assert.equal(db.read("workOrders/wo1").managerId, "mgrElec");

  await rejects(call("admin", "importRouting", {categories: routingDefaults()}), "failed-precondition", /already/);
});

test("category edits: add, remap, deactivate; fallback protected; non-admins blocked", async () => {
  seedRoutingManagers();
  await rejects(call("admin", "saveCategory", {name: "Plumbing", active: true}), "failed-precondition", /Set up routing/);
  await call("admin", "importRouting", {categories: routingDefaults()});

  const {id} = await call("admin", "saveCategory", {name: "Plumbing", description: "Pipes", active: true, managerId: "mgrAppliance"});
  assert.equal(db.read(`categories/${id}`).managerId, "mgrAppliance");

  await rejects(call("admin", "saveCategory", {name: "hvac", active: true}), "already-exists");
  await rejects(call("admin", "saveCategory", {id: catId("General Maintenance"), name: "General Maintenance", active: false}), "failed-precondition", /must stay active/);
  await rejects(call("admin", "saveCategory", {id: catId("General Maintenance"), name: "Misc", active: true}), "failed-precondition", /can't be renamed/);

  await call("admin", "saveCategory", {id: catId("HVAC"), name: "HVAC", description: "", active: true, managerId: "mgr"});
  assert.equal(db.read(`categories/${catId("HVAC")}`).managerId, "mgr");

  for (const uid of ["mgr", "tech", "req"]) {
    await rejects(call(uid, "saveCategory", {name: "X", active: true}), "permission-denied");
  }
});

test("after setup, managers act only on records routed to them", async () => {
  seedRoutingManagers();
  await call("admin", "importRouting", {categories: routingDefaults()});
  db.seed("requests/r1", {requesterId: "req", status: "submitted", analysisStatus: "completed", routedCategory: "HVAC", routedManagerId: "mgrElec", priority: "Medium"});

  // mgr's legacy category is HVAC, but routing now sends HVAC to the Electrical manager.
  await rejects(call("mgr", "updateRequest", {id: "r1", changes: {priority: "High"}}), "permission-denied");
  await call("mgrElec", "updateRequest", {id: "r1", changes: {priority: "High"}});
  assert.equal(db.read("requests/r1").priority, "High");
});

// ---------------- PB-04 review corrections ----------------

test("review corrections are saved with history; original AI recommendation is kept", async () => {
  db.seed("requests/rv", {requesterId: "req", status: "submitted", analysisStatus: "completed", routedCategory: "HVAC", priority: "Medium", safety: false, description: "Leak", ai: {category: "HVAC", trade: "HVAC Technician", priority: "Medium", safetyFlag: false}});

  const result = await call("mgr", "updateRequest", {id: "rv", changes: {priority: "High", safety: true, trade: "Plumber", note: "Water near panel"}});
  assert.equal(result.unchanged, false);

  const r = db.read("requests/rv");
  assert.equal(r.priority, "High");
  assert.equal(r.safety, true);
  assert.equal(r.reviewedTrade, "Plumber");
  assert.equal(r.ai.priority, "Medium", "AI recommendation untouched");

  const {original, entries} = await call("mgr", "listReviewHistory", {id: "rv"});
  assert.equal(original.ai.trade, "HVAC Technician");
  assert.equal(entries.length, 1);
  assert.equal(entries[0].changedByName, "Erin");
  assert.equal(entries[0].note, "Water near panel");
  assert.deepEqual(entries[0].changes.map((c) => [c.field, c.from, c.to]), [["priority", "Medium", "High"], ["safety", false, true], ["reviewedTrade", "HVAC Technician", "Plumber"]]);

  // Saving the same values again records nothing new.
  assert.equal((await call("mgr", "updateRequest", {id: "rv", changes: {priority: "High"}})).unchanged, true);

  for (const uid of ["req", "tech", "mgrOther"]) {
    await rejects(call(uid, "listReviewHistory", {id: "rv"}), "permission-denied");
  }
  assert.ok(!JSON.stringify(db.read("requests/rv")).includes("Water near panel"), "note stays internal");
});

test("changing the category reroutes to the mapped manager, or General Maintenance if unknown", async () => {
  seedRoutingManagers();
  await call("admin", "importRouting", {categories: routingDefaults()});
  db.seed("requests/a", {requesterId: "req", status: "submitted", analysisStatus: "completed", routedCategory: "HVAC", routedManagerId: "mgrElec", priority: "Medium"});
  db.seed("requests/b", {requesterId: "req", status: "submitted", analysisStatus: "completed", routedCategory: "HVAC", routedManagerId: "mgrElec", priority: "Medium"});

  const moved = await call("mgrElec", "updateRequest", {id: "a", changes: {category: "Information Technology"}});
  assert.equal(moved.reroute.movedQueue, true);
  assert.equal(db.read("requests/a").routedManagerId, "mgrIT");
  await rejects(call("mgrElec", "updateRequest", {id: "a", changes: {priority: "Low"}}), "permission-denied", /another manager/);
  await call("mgrIT", "updateRequest", {id: "a", changes: {priority: "Low"}});

  await call("mgrElec", "updateRequest", {id: "b", changes: {category: "Electronics"}});
  assert.equal(db.read("requests/b").routedCategory, "General Maintenance");
  assert.equal(db.read("requests/b").routingReason, "unknown");
  assert.equal(db.read("requests/b").routedManagerId, null);
});

test("an existing inactive priority can be kept while editing other fields", async () => {
  await call("admin", "importPriorityLevels", {levels: DEMO_LEVELS});
  const lowId = [...db.store.entries()].find(([k, v]) => k.startsWith("priorityLevels/") && v.name === "Low")[0].split("/")[1];
  await call("admin", "savePriorityLevel", {...DEMO_LEVELS[3], id: lowId, active: false});
  db.seed("requests/keep", {requesterId: "req", status: "submitted", analysisStatus: "completed", routedCategory: "HVAC", priority: "Low"});

  await call("mgr", "updateRequest", {id: "keep", changes: {priority: "Low", safety: true}});
  assert.equal(db.read("requests/keep").priority, "Low");
  await rejects(call("mgr", "updateRequest", {id: "keep", changes: {priority: "Lowest"}}), "invalid-argument");
});

// ---------------- PB-20 assets ----------------

const assetInput = (overrides = {}) => ({tag: "ac-204", name: "Ceiling AC", type: "HVAC", category: "HVAC", buildingId: "b1", roomId: "r204", status: "Operational", installDate: "2024-01-15", warrantyExpiry: "2029-01-15", documents: [{name: "Manual", url: "https://example.com/manual.pdf"}], ...overrides});
const seedBuilding = () => {
  db.seed("buildings/b1", {name: "Building A", active: true});
  db.seed("buildings/b1/rooms/r204", {name: "Room 204", active: true});
};

test("admins create assets with unique tags and required fields", async () => {
  seedBuilding();
  const {id} = await call("admin", "createAsset", assetInput());
  assert.equal(id, "AC-204");
  const saved = db.read("assets/AC-204");
  assert.equal(saved.location, "Building A - Room 204");
  assert.equal(saved.documents.length, 1);

  await rejects(call("admin", "createAsset", assetInput({tag: "AC-204"})), "already-exists");
  for (const bad of [{name: ""}, {status: "Broken"}, {buildingId: "nope"}, {tag: "bad tag!"}, {warrantyExpiry: "2020-01-01"}, {documents: [{name: "x", url: "ftp://x"}]}]) {
    await rejects(call("admin", "createAsset", assetInput({tag: "NEW-1", ...bad})), (bad.buildingId ? "invalid-argument" : "invalid-argument"));
  }
  assert.equal(db.read("assets/NEW-1"), undefined);
  for (const uid of ["mgr", "tech", "req"]) {
    await rejects(call(uid, "createAsset", assetInput({tag: "X-1"})), "permission-denied");
  }
});

test("admins edit asset details; the tag can't change; others are rejected", async () => {
  seedBuilding();
  await call("admin", "createAsset", assetInput());
  await call("admin", "updateAsset", {...assetInput(), id: "AC-204", status: "Needs Maintenance", roomId: "", documents: []});
  const saved = db.read("assets/AC-204");
  assert.equal(saved.status, "Needs Maintenance");
  assert.equal(saved.location, "Building A");
  assert.deepEqual(saved.documents, []);

  await rejects(call("admin", "updateAsset", {...assetInput({tag: "AC-999"}), id: "AC-204"}), "invalid-argument", /can't be changed/);
  await rejects(call("admin", "updateAsset", {...assetInput(), id: "AC-204", name: ""}), "invalid-argument");
  await rejects(call("mgr", "updateAsset", {...assetInput(), id: "AC-204", name: "Hacked"}), "permission-denied");
  assert.equal(db.read("assets/AC-204").name, "Ceiling AC");
});

// ---------------- PB-35 support settings ----------------

test("only admins publish the facilities contact; verified contacts need a phone", async () => {
  await rejects(call("admin", "saveSupportSettings", {emergencyPhone: "", verified: true}), "invalid-argument", /phone number/);
  await rejects(call("admin", "saveSupportSettings", {emergencyPhone: "call me", verified: false}), "invalid-argument");
  await rejects(call("req", "saveSupportSettings", {emergencyPhone: "(936) 261-1234", verified: true}), "permission-denied");

  await call("admin", "saveSupportSettings", {emergencyLabel: "Facilities Emergency Line", emergencyPhone: "(936) 261-1234", verified: true});
  assert.equal(db.read("settings/support").verified, true);
});

test("approval keeps an existing inactive priority but rejects choosing one", async () => {
  await call("admin", "importPriorityLevels", {levels: DEMO_LEVELS});
  const lowId = [...db.store.entries()].find(([k, v]) => k.startsWith("priorityLevels/") && v.name === "Low")[0].split("/")[1];
  await call("admin", "savePriorityLevel", {...DEMO_LEVELS[3], id: lowId, active: false});
  const order = (priority) => ({title: "Fix", description: "Fix it", trade: "HVAC Technician", priority, safety: false, technicianId: ""});

  db.seed("requests/ap1", {requesterId: "req", status: "submitted", analysisStatus: "completed", routedCategory: "HVAC", priority: "Low"});
  await call("mgr", "approveRequest", {requestId: "ap1", workOrder: order("Low")});
  assert.equal(db.read("requests/ap1").status, "Approved");

  db.seed("requests/ap2", {requesterId: "req", status: "submitted", analysisStatus: "completed", routedCategory: "HVAC", priority: "High"});
  await rejects(call("mgr", "approveRequest", {requestId: "ap2", workOrder: order("Low")}), "invalid-argument");
});

test("approval after routing setup stamps the owning manager and the request's category", async () => {
  seedRoutingManagers();
  await call("admin", "importRouting", {categories: routingDefaults()});
  db.seed("requests/ap3", {requesterId: "req", status: "submitted", analysisStatus: "completed", routedCategory: "HVAC", routedManagerId: "mgrElec", priority: "Medium"});
  db.seed("users/techH", {active: true, role: "technician", trade: "HVAC Technician", name: "Tunde"});

  await rejects(call("mgrElec", "approveRequest", {requestId: "ap3", workOrder: {title: "x", description: "y", trade: "HVAC Technician", priority: "Medium", safety: false, category: "Electrical"}}), "failed-precondition", /Save changes first/);
  const {id} = await call("mgrElec", "approveRequest", {requestId: "ap3", workOrder: {title: "x", description: "y", trade: "HVAC Technician", priority: "Medium", safety: false, technicianId: "techH", category: "HVAC"}});
  const wo = db.read(`workOrders/${id}`);
  assert.equal(wo.category, "HVAC");
  assert.equal(wo.managerId, "mgrElec");

  await call("mgrElec", "scheduleWorkOrder", {id, serviceDate: "2026-12-02", startTime: "09:00", durationHours: 1, timeZone: "America/Chicago"});
  await rejects(call("mgr", "scheduleWorkOrder", {id, serviceDate: "2026-12-02", startTime: "11:00", durationHours: 1, timeZone: "America/Chicago"}), "permission-denied");
});

test("requests from the older backend ('Submitted') and failed analyses can be reviewed", async () => {
  db.seed("requests/legacy", {requesterId: "req", status: "Submitted", analysisStatus: "completed", routedCategory: "HVAC", priority: "Medium"});
  db.seed("requests/aiFailed", {requesterId: "req", status: "submitted", analysisStatus: "failed", routedCategory: "HVAC", priority: "Medium"});
  await call("mgr", "updateRequest", {id: "legacy", changes: {priority: "High"}});
  assert.equal(db.read("requests/legacy").priority, "High");
  await call("mgr", "rejectRequest", {id: "aiFailed", note: "Duplicate"});
  assert.equal(db.read("requests/aiFailed").status, "Rejected");

  db.seed("requests/analyzing", {requesterId: "req", status: "submitted", analysisStatus: "pending", routedCategory: "HVAC"});
  await rejects(call("mgr", "updateRequest", {id: "analyzing", changes: {priority: "High"}}), "failed-precondition", /still being analyzed/);
  await rejects(call("mgr", "rejectRequest", {id: "aiFailed", note: "again"}), "failed-precondition", /already been rejected/);
});

test("older requests with no analysis status or other status words can be reviewed", async () => {
  db.seed("requests/old1", {requesterId: "req", status: "Submitted", routedCategory: "HVAC", priority: "Medium", ai: null});
  db.seed("requests/old2", {requesterId: "req", status: "Under Review", analysisStatus: "completed", routedCategory: "HVAC", priority: "Medium"});
  await call("mgr", "rejectRequest", {id: "old1", note: "Old duplicate"});
  assert.equal(db.read("requests/old1").status, "Rejected");
  await call("mgr", "updateRequest", {id: "old2", changes: {priority: "High"}});
  assert.equal(db.read("requests/old2").priority, "High");

  db.seed("requests/done", {requesterId: "req", status: "Completed", analysisStatus: "completed", routedCategory: "HVAC"});
  await rejects(call("mgr", "rejectRequest", {id: "done"}), "failed-precondition", /already completed/);
});

// ---------------- Trades ----------------

const DEFAULT_TRADES = require("../trades").DEFAULT_TRADES;
const tradeId = (name) => [...db.store.entries()].find(([k, v]) => k.startsWith("trades/") && v.name === name)[0].split("/")[1];

test("admins import trades once; duplicates by meaning are rejected", async () => {
  await rejects(call("mgr", "importTrades", {trades: DEFAULT_TRADES}), "permission-denied");
  await rejects(call("admin", "saveTrade", {name: "Carpenter", active: true}), "failed-precondition", /first/);
  await rejects(call("admin", "importTrades", {trades: [...DEFAULT_TRADES, {name: "HVAC", active: true}]}), "invalid-argument", /unique/);

  assert.equal((await call("admin", "importTrades", {trades: DEFAULT_TRADES})).count, 4);
  await rejects(call("admin", "importTrades", {trades: DEFAULT_TRADES}), "failed-precondition", /already saved/);

  await call("admin", "saveTrade", {name: "Carpenter", description: "Doors and furniture", active: true});
  await rejects(call("admin", "saveTrade", {name: "electric", active: true}), "already-exists", /Electrician/);
  for (const uid of ["mgr", "tech", "req"]) {
    await rejects(call(uid, "saveTrade", {name: "Painter", active: true}), "permission-denied");
  }
});

test("used trades can't be renamed; inactive trades can't be newly chosen but can be kept", async () => {
  await call("admin", "importTrades", {trades: DEFAULT_TRADES});
  // tech/tech2 are seeded with trade "HVAC Technician".
  await rejects(call("admin", "saveTrade", {id: tradeId("HVAC Technician"), name: "HVAC Engineer", active: true}), "failed-precondition", /can't be renamed/);
  await call("admin", "saveTrade", {id: tradeId("Plumber"), name: "Plumber", description: "", active: false});

  db.seed("requests/tr1", {requesterId: "req", status: "submitted", analysisStatus: "completed", routedCategory: "HVAC", priority: "Medium", ai: {trade: "Plumber"}});
  await rejects(call("mgr", "updateRequest", {id: "tr1", changes: {trade: "Plumbing"}}), "invalid-argument", /Trade must be one of/);
  await call("mgr", "updateRequest", {id: "tr1", changes: {trade: "hvac tech"}});
  assert.equal(db.read("requests/tr1").reviewedTrade, "HVAC Technician", "stored as the canonical name");

  // Approval may keep the request's own (now inactive) trade.
  db.seed("requests/tr2", {requesterId: "req", status: "submitted", analysisStatus: "completed", routedCategory: "HVAC", priority: "Medium", ai: {trade: "Plumber"}});
  const {id} = await call("mgr", "approveRequest", {requestId: "tr2", workOrder: {title: "x", description: "y", trade: "Plumber", priority: "Medium", safety: false}});
  assert.equal(db.read(`workOrders/${id}`).trade, "Plumber");
});

test("technician accounts need an active trade", async () => {
  await call("admin", "importTrades", {trades: DEFAULT_TRADES});
  await call("admin", "saveTrade", {id: tradeId("Plumber"), name: "Plumber", description: "", active: false});
  await rejects(call("admin", "updateUser", {uid: "tech", trade: "Plumber"}), "invalid-argument", /Trade must be one of/);
  await call("admin", "updateUser", {uid: "tech", trade: "electrician"});
  assert.equal(db.read("users/tech").trade, "Electrician");
});
