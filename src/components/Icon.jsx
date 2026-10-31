// Single icon component. Stroke icons follow a 24x24 grid and inherit
// `currentColor`, so color is set with CSS `color` on the icon or its parent.

const STROKE = {
  home: '<path d="M3 11 12 3.5 21 11M5.5 9v11.5h4.5v-6h4v6h4.5V9"/>',
  filePlus: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z"/><path d="M14 3v5h5M12 11v6M9 14h6"/>',
  fileText: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z"/><path d="M14 3v5h5M9 12h6M9 16h6"/>',
  bell: '<path d="M6 16V11a6 6 0 1 1 12 0v5l2 2H4l2-2Z"/><path d="M10 21a2 2 0 0 0 4 0"/>',
  help: '<circle cx="12" cy="12" r="9.5"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.4 2.3c-.6.3-.9.8-.9 1.4v.6"/><path d="M12 17h.01"/>',
  logOut: '<path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4"/><path d="M15 16l4-4-4-4M19 12H9"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m20 20-4.5-4.5"/>',
  chevronDown: '<path d="m6 9 6 6 6-6"/>',
  chevronRight: '<path d="m9 6 6 6-6 6"/>',
  chevronLeft: '<path d="m15 6-6 6 6 6"/>',
  arrowRight: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  alertTriangle: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/>',
  info: '<circle cx="12" cy="12" r="9.5"/><path d="M12 11v6M12 7.5h.01"/>',
  mapPin: '<path d="M12 21s7-6.2 7-11.5a7 7 0 1 0-14 0C5 14.8 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 6.5 8.5 7 8.5-7"/>',
  upload: '<path d="M7 18a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18 8a4 4 0 0 1-.5 8"/><path d="M12 12v9M9 15l3-3 3 3"/>',
  clipboard: '<rect x="5" y="4.5" width="14" height="17" rx="2"/><rect x="9" y="2.5" width="6" height="4" rx="1"/><path d="M8.5 11h7M8.5 15h7"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4M7.5 14h2M11 14h2M14.5 14h2"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  alarm: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M4 5l3-2.5M20 5l-3-2.5"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><circle cx="17" cy="8.5" r="3"/><path d="M16 14a5.5 5.5 0 0 1 6 5.5"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  box: '<path d="M12 2.5 20.5 7v10L12 21.5 3.5 17V7L12 2.5Z"/><path d="M3.5 7 12 11.5 20.5 7M12 11.5v10"/>',
  inventory: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h2M8 12h2M8 16h2M13 8h3M13 12h3M13 16h3"/>',
  list: '<rect x="3.5" y="4" width="17" height="16" rx="2"/><path d="M7.5 9h1M11 9h6M7.5 12.5h1M11 12.5h6M7.5 16h1M11 16h6"/>',
  barChart: '<path d="M4 3v17.5h17"/><path d="M8.5 17v-5M12.5 17V8M16.5 17v-7"/>',
  bars: '<path d="M3 20.5h18"/><rect x="5" y="13" width="3" height="7.5" rx=".5"/><rect x="10.5" y="9" width="3" height="11.5" rx=".5"/><rect x="16" y="4" width="3" height="16.5" rx=".5"/>',
  edit: '<path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  copy: '<rect x="8" y="3" width="12" height="15" rx="2"/><path d="M5 7v12a2 2 0 0 0 2 2h9"/>',
  history: '<path d="M3.5 12a8.5 8.5 0 1 0 2.5-6L3.5 8.5"/><path d="M3.5 3.5v5h5M12 8v4.5l3 2"/>',
  wrench: '<path d="M14.7 6.3a4 4 0 0 0 5 5l-9.4 9.4a2.1 2.1 0 0 1-3-3l9.4-9.4a4 4 0 0 1-2-2Z"/><path d="M14.7 6.3 18 3l3 3-3.3 3.3"/>',
  folder: '<path d="M4 6a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6Z"/><path d="M8 12h8M8 16h5"/>',
  flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
  route: '<circle cx="6" cy="6" r="2.5"/><circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="12" r="2.5"/><path d="M8.5 6H12a3 3 0 0 1 3 3v1M8.5 18H12a3 3 0 0 0 3-3v-1"/>',
  printer: '<path d="M7 9V3h10v6M7 17H4v-7h16v7h-3"/><rect x="7" y="14" width="10" height="7"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5M4 17v3h16v-3"/>',
  eye: '<path d="M2 12c1-2.5 5-7 10-7s9 4.5 10 7c-1 2.5-5 7-10 7S3 14.5 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff: '<path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.2A9.8 9.8 0 0 1 12 5c5 0 9 4.5 10 7-.4 1-1.3 2.4-2.6 3.7M6.6 6.6C4.4 8 2.9 10.2 2 12c1 2.5 5 7 10 7 1.8 0 3.4-.6 4.8-1.4"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10.5" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3M12 14.5v2.5"/>',
  cart: '<path d="M2.5 3.5h3l2.5 12h11l2-8.5H6.5"/><circle cx="9.5" cy="19.5" r="1.3"/><circle cx="17.5" cy="19.5" r="1.3"/>',
  headset: '<path d="M4 14v-2a8 8 0 0 1 16 0v2"/><rect x="3" y="13" width="4" height="6" rx="1.5"/><rect x="17" y="13" width="4" height="6" rx="1.5"/><path d="M19 19a3 3 0 0 1-3 3h-3"/>',
  save: '<path d="M5 3h11l4 4v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a1 1 0 0 1 1-1Z"/><path d="M8 3v5h7V3M7 21v-7h10v7"/>',
  ban: '<circle cx="12" cy="12" r="9"/><path d="m5.6 5.6 12.8 12.8"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1"/>',
  taskLine: '<rect x="3.5" y="3.5" width="17" height="17" rx="2.5"/><path d="m8 12 3 3 5-6"/>',
  queueLine: '<rect x="3.5" y="3.5" width="17" height="17" rx="2.5"/><path d="M7 8.5h3.5M7 12h3.5M7 15.5h3.5M13.5 8.5l1 1 2-2M13.5 12l1 1 2-2M13.5 15.5l1 1 2-2"/>',
  editDoc: '<rect x="4" y="3" width="16" height="18" rx="2.5"/><path d="m9 15 6-6M9 15l.6-2.4M9 15l2.4-.6"/>',
  shieldLoc: '<path d="M12 2.5 20.5 7v10L12 21.5 3.5 17V7L12 2.5Z"/><circle cx="12" cy="12" r="3"/>',
  dots: '<circle cx="12" cy="5" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="12" cy="19" r="1.2"/>',
  send: '<path d="M21.5 2.5 2.5 10.2l7 2.8 2.8 7L21.5 2.5Z"/><path d="m9.5 13 5-5"/>',
  phoneLine: '<path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1l-2.2 2.23Z"/>',
};

// Filled / multi-color icons
const FILLED = {
  phone: '<path fill="currentColor" d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1l-2.2 2.23Z"/>',
  homeSolid: '<path fill="currentColor" d="M12 3 2 11.5h3V21h5.5v-6h3v6H19v-9.5h3L12 3Z"/>',
  checkCircle: '<circle cx="12" cy="12" r="11" fill="currentColor"/><path d="m7 12.5 3.3 3.3L17 9" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  alertCircle: '<circle cx="12" cy="12" r="11" fill="currentColor"/><path d="M12 6.5v7" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/><circle cx="12" cy="17.3" r="1.4" fill="#fff"/>',
  infoCircle: '<circle cx="12" cy="12" r="11" fill="currentColor"/><path d="M12 11v6.5" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/><circle cx="12" cy="7" r="1.5" fill="#fff"/>',
  plusCircle: '<circle cx="12" cy="12" r="11" fill="currentColor"/><path d="M12 7v10M7 12h10" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>',
  dotCircle: '<circle cx="12" cy="12" r="11" fill="currentColor"/><circle cx="12" cy="12" r="3.6" fill="#fff"/>',
  clockCircle: '<circle cx="12" cy="12" r="11" fill="currentColor"/><circle cx="12" cy="12" r="6.5" fill="none" stroke="#fff" stroke-width="2"/><path d="M12 8.5V12l2.2 1.6" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/>',
  sparkles: '<path fill="currentColor" d="M10 2 12 9l7 2-7 2-2 7-2-7-7-2 7-2 2-7Z"/><path fill="currentColor" d="M19 1.5l.8 2.7 2.7.8-2.7.8-.8 2.7-.8-2.7-2.7-.8 2.7-.8.8-2.7Z"/>',
  bulb: '<path d="M12 5.5a6 6 0 0 0-3.7 10.7V18h7.4v-1.8A6 6 0 0 0 12 5.5Z" fill="currentColor"/><rect x="9.5" y="19.3" width="5" height="2" rx="1" fill="currentColor" opacity=".75"/><path d="M12 1v2M3.5 4.5l1.5 1.5M20.5 4.5 19 6M1 12h2M21 12h2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  taskSolid: '<rect x="3" y="3" width="18" height="18" rx="3" fill="currentColor"/><path d="m7.5 12 3 3 6-6" stroke="var(--icon-accent, #2563EB)" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  queueSolid: '<rect x="3" y="3" width="18" height="18" rx="2.5" fill="currentColor"/><path d="M7 8h4M7 12h4M7 16h4M14 8l1 1 2-2M14 12l1 1 2-2M14 16l1 1 2-2" stroke="var(--icon-accent, #2563EB)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
  editDocSolid: '<rect x="4" y="3" width="16" height="18" rx="2.5" fill="currentColor"/><path d="m9 15 6-6M9 15l.6-2.4M9 15l2.4-.6" stroke="var(--icon-accent, #2563EB)" stroke-width="1.8" stroke-linecap="round" fill="none"/>',
  docSolid: '<path fill="currentColor" d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7l-5-5Z"/><path d="M9 12h6M9 16h6" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>',
  warnSolid: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" fill="currentColor"/><path d="M12 9v4.5" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/><circle cx="12" cy="17" r="1.2" fill="#fff"/>',
  personSolid: '<circle cx="12" cy="8" r="4.5" fill="currentColor"/><path fill="currentColor" d="M3.5 21a8.5 8.5 0 0 1 17 0Z"/>',
  groupSolid: '<g fill="currentColor"><circle cx="12" cy="7.5" r="3.2"/><circle cx="5.5" cy="9.5" r="2.4"/><circle cx="18.5" cy="9.5" r="2.4"/><path d="M6.5 19a5.5 5.5 0 0 1 11 0Z"/><path d="M1 19a4.5 4.5 0 0 1 5.8-4.3A7 7 0 0 0 5 19Zm22 0a4.5 4.5 0 0 0-5.8-4.3A7 7 0 0 1 19 19Z"/></g>',
  hardhatSolid: '<g fill="currentColor"><path d="M3 15a9 9 0 0 1 18 0Z"/><rect x="2" y="15" width="20" height="2.5" rx="1.2"/><path d="M6 17.5h12a6 6 0 0 1-12 0Z"/></g><rect x="10.5" y="4" width="3" height="6" rx="1" fill="var(--icon-accent, #D5F0DF)"/>',
  shieldSolid: '<path fill="currentColor" d="M12 2.5 20 5.5v6c0 5-3.4 8.6-8 10-4.6-1.4-8-5-8-10v-6l8-3Z"/><path d="M13 7l-3.5 6H12l-1 4 3.5-6H12l1-4Z" fill="#fff"/>',
  barcode: '<g fill="currentColor"><rect x="3" y="5" width="1.6" height="14"/><rect x="6" y="5" width="1" height="14"/><rect x="8.5" y="5" width="2" height="14"/><rect x="12" y="5" width="1" height="14"/><rect x="14.5" y="5" width="1.6" height="14"/><rect x="17.5" y="5" width="1" height="14"/><rect x="19.5" y="5" width="1.5" height="14"/></g>',
};

export default function Icon({ name, size = 20, strokeWidth = 1.8, className = '', style, title }) {
  const filled = FILLED[name];
  const markup = filled || STROKE[name];
  if (!markup) return null;
  return (
    <svg
      className={`icon ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={filled ? 'none' : 'currentColor'}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      dangerouslySetInnerHTML={{ __html: (title ? `<title>${title}</title>` : '') + markup }}
    />
  );
}

export function BrandMark({ size = 40, color = '#3B82F6' }) {
  return (
    <svg width={size} height={size * 1.08} viewBox="0 0 46 50" fill="none" aria-hidden="true" className="icon">
      <path
        d="M39.5 3.5a11 11 0 0 0-13.8 14.1L4.2 39.1a4.2 4.2 0 0 0 0 5.9l.8.8a4.2 4.2 0 0 0 5.9 0l21.5-21.5A11 11 0 0 0 46.5 10.5l-7 7-6.3-1.3-1.3-6.3 7.6-6.4Z"
        fill={color}
        transform="translate(-2 0)"
      />
    </svg>
  );
}
