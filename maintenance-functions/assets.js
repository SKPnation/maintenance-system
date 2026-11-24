/* eslint-disable require-jsdoc, max-len */

"use strict";

// Asset record validation (PB-20). Pure: no Firestore.

const {HttpsError} = require("firebase-functions/v2/https");

const ASSET_STATUSES = ["Operational", "Needs Maintenance", "Out of Service", "Retired"];

function invalid(message) {
  return new HttpsError("invalid-argument", message);
}

function text(value, label, {required = false, max = 120} = {}) {
  if (value == null || value === "") {
    if (required) throw invalid(`Enter ${label}.`);
    return "";
  }

  if (typeof value !== "string") throw invalid(`Invalid ${label}.`);

  const trimmed = value.trim();

  if (required && !trimmed) throw invalid(`Enter ${label}.`);
  if (trimmed.length > max) throw invalid(`${label[0].toUpperCase()}${label.slice(1)} is limited to ${max} characters.`);

  return trimmed;
}

// Tags are case-insensitive and used as the document ID, which makes them unique.
function normalizeTag(value) {
  const tag = text(value, "an asset tag", {required: true, max: 32}).toUpperCase();

  if (!/^[A-Z0-9][A-Z0-9-]*$/.test(tag)) {
    throw invalid("Asset tags may use letters, numbers and hyphens only (e.g. AC-204).");
  }

  return tag;
}

function date(value, label) {
  if (value == null || value === "") return "";

  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) {
    throw invalid(`Enter a valid ${label}.`);
  }

  return value;
}

function documents(value) {
  if (value == null) return [];
  if (!Array.isArray(value) || value.length > 10) throw invalid("Add up to 10 related documents.");

  return value.map((doc) => {
    const name = text(doc && doc.name, "a document name", {required: true, max: 120});
    const url = text(doc && doc.url, "a document link", {required: true, max: 500});

    if (!/^https:\/\/\S+$/i.test(url)) throw invalid(`The link for "${name}" must start with https://.`);

    return {name, url};
  });
}

// Validate editable asset fields (everything except the tag).
function validateAssetFields(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw invalid("Asset details are required.");
  }

  const status = text(input.status, "a status", {required: true, max: 40});

  if (!ASSET_STATUSES.includes(status)) {
    throw invalid(`Status must be one of: ${ASSET_STATUSES.join(", ")}.`);
  }

  const installDate = date(input.installDate, "install date");
  const warrantyExpiry = date(input.warrantyExpiry, "warranty expiry date");

  if (installDate && warrantyExpiry && warrantyExpiry < installDate) {
    throw invalid("Warranty expiry can't be before the install date.");
  }

  return {
    name: text(input.name, "an asset name", {required: true}),
    type: text(input.type, "an equipment type", {required: true, max: 60}),
    category: text(input.category, "a category", {required: true, max: 60}),
    brand: text(input.brand, "brand"),
    model: text(input.model, "model"),
    serial: text(input.serial, "serial number", {max: 80}),
    buildingId: text(input.buildingId, "a building", {required: true, max: 128}),
    roomId: text(input.roomId, "room", {max: 128}),
    locationDetail: text(input.locationDetail, "location details", {max: 200}),
    status,
    installDate,
    warrantyExpiry,
    documents: documents(input.documents),
  };
}

module.exports = {ASSET_STATUSES, normalizeTag, validateAssetFields};
