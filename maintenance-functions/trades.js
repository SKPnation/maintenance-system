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

// Primary trade first, then any additional trades.
function technicianTrades(user) {
  const extra = Array.isArray(user && user.additionalTrades) ? user.additionalTrades : [];
  return [user && user.trade, ...extra].filter((t) => typeof t === "string" && t.trim());
}

function hasTrade(user, trade) {
  return technicianTrades(user).some((t) => tradesMatch(t, trade));
}

// Additional trades: canonical active names, no duplicates, not the primary.
// Trades the technician already had may stay even if since deactivated.
function validateAdditionalTrades(value, trades, {primary = "", existing = []} = {}) {
  if (value == null) return [];

  if (!Array.isArray(value) || value.length > 10) {
    throw new HttpsError("invalid-argument", "Choose up to 10 additional trades.");
  }

  const result = [];

  for (const item of value) {
    if (typeof item !== "string" || !item.trim()) continue;

    const kept = existing.find((t) => tradesMatch(t, item));
    const name = kept || requireActiveTrade(item, trades);

    if (tradesMatch(name, primary) || result.some((t) => tradesMatch(t, name))) continue;

    result.push(name);
  }

  return result;
}

module.exports = {DEFAULT_TRADES, activeTrades, hasTrade, matchActiveTrade, requireActiveTrade, technicianTrades, validateAdditionalTrades, validateTrade};
