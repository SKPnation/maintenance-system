// Date/number formatting helpers used across screens.
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const LONG_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// Accepts Date, ISO string, epoch ms or Firestore Timestamp.
export const toDate = (v) => {
  if (!v) return null;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
  if (typeof v.toDate === 'function') return v.toDate();
  if (typeof v.seconds === 'number') return new Date(v.seconds * 1000);
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

export const fmtDate = (v) => { const d = toDate(v); if (!d) return '-'; return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`; };
export const fmtTime = (v) => {
  const d = toDate(v);
  if (!d) return '';
  let h = d.getHours(); const m = String(d.getMinutes()).padStart(2, '0');
  const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12;
  return `${String(h).padStart(2, '0')}:${m} ${ap}`;
};
export const fmtDateTime = (v) => (toDate(v) ? `${fmtDate(v)} at ${fmtTime(v)}` : '-');
export const fmtLongDay = (v) => { const d = toDate(v); if (!d) return '-'; return `${DAYS[d.getDay()]}, ${LONG_MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`; };
export const sameDay = (a, b) => { const x = toDate(a), y = toDate(b); if (!x || !y) return false; return x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth() && x.getDate() === y.getDate(); };
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

// "2.5" → "2 h 30 min"
export const fmtHours = (h) => {
  const n = Number(h);
  if (!Number.isFinite(n) || n <= 0) return '-';
  const whole = Math.floor(n); const mins = Math.round((n - whole) * 60);
  return [whole ? `${whole} hour${whole === 1 ? '' : 's'}` : '', mins ? `${mins} min` : ''].filter(Boolean).join(' ');
};

// Service window like "Nov 12, 2026 · 9:00 AM – 11:00 AM".
export const fmtServiceWindow = (scheduledAt, durationHours) => {
  const start = toDate(scheduledAt);
  if (!start) return '';
  const end = new Date(start.getTime() + Number(durationHours || 0) * 3600000);
  const t = (d) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `${fmtDate(start)} · ${t(start)} – ${t(end)}`;
};

// Firestore requests use lower-case "submitted"; the UI shows title case.
const REQUEST_STATUS = { submitted: 'Submitted', 'pending review': 'Pending Review', approved: 'Approved', rejected: 'Rejected', completed: 'Completed' };
export const requestStatus = (s) => REQUEST_STATUS[String(s || 'submitted').toLowerCase()] || s;
export const requestSubmittedAt = (r) => r?.submittedAt || r?.createdAt || null;
export const byNewest = (a, b) => (toDate(requestSubmittedAt(b))?.getTime() || 0) - (toDate(requestSubmittedAt(a))?.getTime() || 0);

// Local yyyy-mm-dd for <input type="date">.
export const localDateKey = (v) => {
  const d = toDate(v);
  if (!d) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
