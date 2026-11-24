/* eslint-disable require-jsdoc, max-len */

"use strict";

// Categories and category -> manager routing (PB-13). Pure: no Firestore.

const {HttpsError} = require("firebase-functions/v2/https");

const FALLBACK_CATEGORY = "General Maintenance";

// Agreed starting set. `defaultManager` is a hint used to preselect a manager.
const DEFAULT_CATEGORIES = [
  {name: "Appliance/Equipment", description: "Appliances and building equipment such as refrigerators, washers, elevators and pumps.", defaultManager: "Appliance Manager"},
  {name: "Electrical", description: "Power, lighting, outlets, breakers and wiring.", defaultManager: "Electrical Category Manager"},
  {name: "HVAC", description: "Heating, ventilation, air conditioning and thermostats.", defaultManager: "Electrical Category Manager"},
  {name: "Information Technology", description: "Computers, network, Wi-Fi, printers, projectors and connected devices.", defaultManager: "IT Manager"},
  {name: FALLBACK_CATEGORY, description: "Requests with no valid category match. Reviewed manually.", defaultManager: ""},
];

const normalize = (value) => String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
const isFallback = (name) => normalize(name) === normalize(FALLBACK_CATEGORY);

function invalid(message) {
  return new HttpsError("invalid-argument", message);
}

// Validate one category from the admin forms. Returns the fields to store.
function validateCategory(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw invalid("Category details are required.");
  }

  const name = typeof input.name === "string" ? input.name.trim().replace(/\s+/g, " ") : "";

  if (!name || name.length > 60) {
    throw invalid("Enter a category name of up to 60 characters.");
  }

  const description = typeof input.description === "string" ? input.description.trim() : "";

  if (description.length > 500) {
    throw invalid("Descriptions are limited to 500 characters.");
  }

  if (typeof input.active !== "boolean") {
    throw invalid("Status must be active or inactive.");
  }

  if (isFallback(name) && !input.active) {
    throw new HttpsError("failed-precondition", `${FALLBACK_CATEGORY} is the fallback category and must stay active.`);
  }

  const managerId = input.managerId == null ? "" : input.managerId;

  if (typeof managerId !== "string" || managerId.length > 128) {
    throw invalid("Invalid manager.");
  }

  return {name, normalizedName: normalize(name), description, active: input.active, managerId};
}

// Decide where a request goes. Unknown, inactive or unmapped categories fall
// back to General Maintenance (whose manager may also be unset: manual review).
function resolveRoute(categoryName, categories) {
  const fallback = categories.find((c) => isFallback(c.name));
  const toFallback = (reason) => ({
    category: fallback ? fallback.name : FALLBACK_CATEGORY,
    managerId: fallback && fallback.active !== false && fallback.managerId ? fallback.managerId : null,
    fallback: true,
    reason,
  });

  const match = categories.find((c) => normalize(c.name) === normalize(categoryName));

  if (!match) return toFallback(categoryName ? "unknown" : "missing");
  if (match.active !== true) return toFallback("inactive");
  if (!match.managerId) return toFallback("unmapped");

  return {category: match.name, managerId: match.managerId, fallback: isFallback(match.name), reason: "matched"};
}

function activeCategoryNames(categories) {
  return categories.filter((c) => c.active === true).map((c) => c.name);
}

// Preselect a manager for each default category: by name hint, then by the
// manager's existing (legacy) category.
function suggestDefaults(managers) {
  const pick = (def) => {
    const hint = normalize(def.defaultManager);
    const byName = hint && managers.find((m) => normalize(m.name) === hint);
    const byCategory = managers.find((m) => normalize(m.category) === normalize(def.name));
    return (byName || byCategory || {}).id || "";
  };

  return DEFAULT_CATEGORIES.map((def) => ({
    name: def.name,
    description: def.description,
    active: true,
    managerId: pick(def),
    defaultManager: def.defaultManager,
  }));
}

module.exports = {
  DEFAULT_CATEGORIES,
  FALLBACK_CATEGORY,
  activeCategoryNames,
  isFallback,
  normalize,
  resolveRoute,
  suggestDefaults,
  validateCategory,
};
