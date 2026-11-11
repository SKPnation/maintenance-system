// Mirrors normalizeTrade in maintenance-functions/workflow.js so the UI offers
// the same technicians the server will accept.
const TRADE_ALIASES = {
  electrician: 'electrical',
  electric: 'electrical',
  plumber: 'plumbing',
  general: 'general maintenance',
  maintenance: 'general maintenance',
  handyman: 'general maintenance',
  'heating ventilation and air conditioning': 'hvac',
  'air conditioning': 'hvac',
};

export function normalizeTrade(value) {
  const text = String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b(technician|technicians|tech|specialist|engineer|worker)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return TRADE_ALIASES[text] || text;
}

export const tradesMatch = (a, b) => {
  const left = normalizeTrade(a);
  return Boolean(left) && left === normalizeTrade(b);
};
