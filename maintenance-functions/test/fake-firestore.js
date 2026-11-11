/* eslint-disable require-jsdoc, max-len */

"use strict";

// Minimal in-memory Firestore covering what index.js uses, so the callable
// handlers can be exercised without the emulator. Not a general-purpose fake.

const SERVER_TIMESTAMP = {__op: "serverTimestamp"};

class Timestamp {
  constructor(ms) {
    this.ms = ms;
  }
  toDate() {
    return new Date(this.ms);
  }
}

const FieldValue = {
  serverTimestamp: () => SERVER_TIMESTAMP,
  arrayUnion: (...items) => ({__op: "arrayUnion", items}),
  increment: (n) => ({__op: "increment", n}),
};

let clock = Date.parse("2026-11-11T16:00:00Z");

function resolve(current, value) {
  if (value === SERVER_TIMESTAMP) return new Timestamp(++clock);
  if (value && value.__op === "arrayUnion") return [...(Array.isArray(current) ? current : []), ...value.items];
  if (value && value.__op === "increment") return (Number(current) || 0) + value.n;
  return value;
}

function applyFields(base, fields) {
  const out = {...base};
  for (const [key, value] of Object.entries(fields)) out[key] = resolve(base[key], value);
  return out;
}

class DocSnapshot {
  constructor(ref, data) {
    this.ref = ref;
    this.id = ref.id;
    this._data = data;
    this.exists = data !== undefined;
  }
  data() {
    return this._data === undefined ? undefined : {...this._data};
  }
  get(field) {
    return this._data ? this._data[field] : undefined;
  }
}

class QuerySnapshot {
  constructor(docs) {
    this.docs = docs;
    this.empty = docs.length === 0;
  }
}

class Query {
  constructor(db, path, filters = [], order = null, max = null) {
    Object.assign(this, {db, path, filters, order, max});
  }
  where(field, op, value) {
    if (op !== "==") throw new Error(`fake: unsupported op ${op}`);
    return new Query(this.db, this.path, [...this.filters, [field, value]], this.order, this.max);
  }
  orderBy(field, dir = "asc") {
    return new Query(this.db, this.path, this.filters, [field, dir], this.max);
  }
  limit(n) {
    return new Query(this.db, this.path, this.filters, this.order, n);
  }
  async get() {
    const prefix = `${this.path}/`;
    let docs = [...this.db.store.entries()]
        .filter(([key]) => key.startsWith(prefix) && !key.slice(prefix.length).includes("/"))
        .map(([key, data]) => new DocSnapshot(this.db.doc(key), data))
        .filter((snap) => this.filters.every(([f, v]) => snap.get(f) === v));
    if (this.order) {
      const [f, dir] = this.order;
      const val = (s) => (s.get(f) instanceof Timestamp ? s.get(f).ms : s.get(f));
      docs.sort((a, b) => (val(a) > val(b) ? 1 : val(a) < val(b) ? -1 : 0) * (dir === "desc" ? -1 : 1));
    }
    if (this.max != null) docs = docs.slice(0, this.max);
    return new QuerySnapshot(docs);
  }
}

class CollectionRef extends Query {
  doc(id) {
    return this.db.doc(`${this.path}/${id || `auto${++this.db.autoId}`}`);
  }
  async add(data) {
    const ref = this.doc();
    await ref.create(data);
    return ref;
  }
}

class DocRef {
  constructor(db, path) {
    this.db = db;
    this.path = path;
    this.id = path.split("/").pop();
  }
  collection(name) {
    return new CollectionRef(this.db, `${this.path}/${name}`);
  }
  async get() {
    return new DocSnapshot(this, this.db.store.get(this.path));
  }
  async create(data) {
    if (this.db.store.has(this.path)) throw Object.assign(new Error("already exists"), {code: 6});
    this.db.store.set(this.path, applyFields({}, data));
  }
  async set(data) {
    this.db.store.set(this.path, applyFields({}, data));
  }
  async update(data) {
    if (!this.db.store.has(this.path)) throw Object.assign(new Error("no document to update"), {code: 5});
    this.db.store.set(this.path, applyFields(this.db.store.get(this.path), data));
  }
  async delete() {
    this.db.store.delete(this.path);
  }
}

class Transaction {
  constructor(db) {
    this.db = db;
    this.writes = [];
  }
  async get(target) {
    if (this.writes.length) throw new Error("fake: transaction read after write");
    return target.get();
  }
  create(ref, data) {
    this.writes.push(() => ref.create(data));
  }
  update(ref, data) {
    this.writes.push(() => ref.update(data));
  }
  set(ref, data) {
    this.writes.push(() => ref.set(data));
  }
}

class FakeFirestore {
  constructor() {
    this.store = new Map();
    this.autoId = 0;
  }
  collection(name) {
    return new CollectionRef(this, name);
  }
  doc(path) {
    return new DocRef(this, path);
  }
  async runTransaction(fn) {
    const snapshot = new Map(this.store);
    const tx = new Transaction(this);
    try {
      const result = await fn(tx);
      for (const write of tx.writes) await write();
      return result;
    } catch (error) {
      this.store = snapshot; // all-or-nothing
      throw error;
    }
  }
  seed(path, data) {
    this.store.set(path, {...data});
  }
  read(path) {
    return this.store.get(path);
  }
}

module.exports = {FakeFirestore, FieldValue, Timestamp};
