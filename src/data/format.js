// Date/number formatting helpers used across screens.
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const LONG_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const toDate = (v) => (v instanceof Date ? v : new Date(v));

export const fmtDate = (v) => { const d = toDate(v); return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`; };
export const fmtTime = (v) => {
  const d = toDate(v);
  let h = d.getHours(); const m = String(d.getMinutes()).padStart(2, '0');
  const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12;
  return `${String(h).padStart(2, '0')}:${m} ${ap}`;
};
export const fmtDateTime = (v) => `${fmtDate(v)} at ${fmtTime(v)}`;
export const fmtLongDay = (v) => { const d = toDate(v); return `${DAYS[d.getDay()]}, ${LONG_MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`; };
export const sameDay = (a, b) => { const x = toDate(a), y = toDate(b); return x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth() && x.getDate() === y.getDate(); };
export const hourLabel = (h) => `${h % 12 || 12}:00 ${h >= 12 ? 'PM' : 'AM'}`;

export const fmtDuration = ({ value, unit }) => {
  if (unit === 'minutes' && value === 0) return 'Immediate';
  const singular = value === 1 ? unit.replace(/s$/, '') : unit;
  return `${value} ${singular}`;
};

export const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
};

// Next sequential ID like MR-2026-0047 given existing IDs with the same prefix.
export const nextId = (prefix, existing) => {
  const nums = existing.filter((id) => id.startsWith(prefix)).map((id) => parseInt(id.slice(prefix.length), 10) || 0);
  return `${prefix}${String(Math.max(0, ...nums) + 1).padStart(4, '0')}`;
};
