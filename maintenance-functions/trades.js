/* eslint-disable require-jsdoc, max-len */

"use strict";

// Technician trades (admin-managed). Pure: no Firestore.

const {HttpsError} = require("firebase-functions/v2/https");
const {normalizeTrade, tradesMatch} = require("./workflow");

// Used until an administrator saves trades to the database.
const DEFAULT_TRADES = [
  {name: "HVAC Technician", description: "Heating, ventilation, air conditioning and thermostats.", active: true},
  {name: "Electrician", description: "Power, lighting, outlets, breakers and wiring.", active: true},
  {name: "Plumber", description: "Pipes, leaks, drains, toilets, taps and water heaters.", active: true},
  {name: "General Maintenance", description: "General repairs that don't need a specialist.", active: true},
];

function validateTrade(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new HttpsError("invalid-argument", "Trade details are required.");
  }

  const name = typeof input.name === "string" ? input.name.trim().replace(/\s+/g, " ") : "";

  if (!name || name.length > 60) {
    throw new HttpsError("invalid-argument", "Enter a trade name of up to 60 characters.");
  }

  const key = normalizeTrade(name);

  if (!key) {
    throw new HttpsError("invalid-argument", "Enter a more specific trade name.");
  }

  const description = typeof input.description === "string" ? input.description.trim() : "";

  if (description.length > 300) {
    throw new HttpsError("invalid-argument", "Descriptions are limited to 300 characters.");
  }

  if (typeof input.active !== "boolean") {
    throw new HttpsError("invalid-argument", "Status must be active or inactive.");
  }

  return {name, key, description, active: input.active};
}

const activeTrades = (trades) => trades.filter((t) => t.active === true);

// Map free text ("HVAC", "hvac tech") to the canonical active trade name, or null.
function matchActiveTrade(value, trades) {
  const match = activeTrades(trades).find((t) => tradesMatch(t.name, value));
  return match ? match.name : null;
}

function requireActiveTrade(value, trades) {
  const match = matchActiveTrade(value, trades);

  if (!match) {
    throw new HttpsError(
        "invalid-argument",
        `Trade must be one of: ${activeTrades(trades).map((t) => t.name).join(", ")}.`,
    );
  }

  return match;
}

module.exports = {DEFAULT_TRADES, activeTrades, matchActiveTrade, requireActiveTrade, validateTrade};
