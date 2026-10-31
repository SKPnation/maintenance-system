// ---------------------------------------------------------------------------
// Mock data. Replace these with API calls when the backend is ready.
// Every entity uses plain objects so the shapes double as API contracts.
// ---------------------------------------------------------------------------

export const USERS = [
  { id: 'u1', name: 'Alex Rivera', initials: 'AR', email: 'alex.rivera@company.com', phone: '(555) 123-4567', role: 'requester', title: 'Requester' },
  { id: 'u2', name: 'Erin Martinez', initials: 'EM', email: 'erin.martinez@company.com', phone: '(555) 234-5678', role: 'manager', title: 'Electrical Manager', category: 'Electrical' },
  { id: 'u3', name: 'James Thompson', initials: 'JT', email: 'james.thompson@company.com', phone: '(555) 345-6789', role: 'technician', title: 'HVAC Technician', trade: 'HVAC Technician' },
  { id: 'u4', name: 'Admin User', initials: 'AD', email: 'admin@company.com', phone: '(555) 000-0000', role: 'admin', title: 'System Administrator' },
];

export const TECHNICIANS = [
  { id: 'u3', name: 'James Thompson', initials: 'JT', trade: 'HVAC Technician' },
  { id: 't2', name: 'Maria Lopez', initials: 'ML', trade: 'Electrician' },
  { id: 't3', name: 'David Chen', initials: 'DC', trade: 'Plumber' },
  { id: 't4', name: 'Sarah Kim', initials: 'SK', trade: 'General Maintenance' },
];

export const LOCATIONS = [
  'Building A - Room 204',
  'Building A - Room 201',
  'Building A - Hallway',
  'Building A - Electrical Room',
  'Building A - Ground Floor',
  'Building A - Roof',
  'Building B - Room 101',
  'Building B - Room 305',
  'Building B - Mechanical Room',
  'Building C - Room 120',
  'Building C - Room 305',
  'Engineering Building - Room 305',
];

export const CATEGORIES = ['Electrical', 'HVAC', 'Plumbing', 'Safety', 'General'];
export const TRADES = ['HVAC Technician', 'Electrician', 'Plumber', 'General Maintenance'];
export const PRIORITY_NAMES = ['Critical', 'High', 'Medium', 'Low'];

export const PRIORITIES = [
  { id: 'p1', name: 'Critical', color: '#EF4444', description: 'Immediate threat to life, safety, property, or essential operations.', response: { value: 0, unit: 'minutes', label: 'Immediate (0 – 15 minutes)' }, resolution: { value: 4, unit: 'hours' }, active: true },
  { id: 'p2', name: 'High', color: '#F97316', description: 'Serious issue requiring rapid attention. Significant impact to operations.', response: { value: 1, unit: 'hours' }, resolution: { value: 8, unit: 'hours' }, active: true },
  { id: 'p3', name: 'Medium', color: '#FBBF24', description: 'Operational issue without immediate danger. Affects normal operations but not critical.', response: { value: 4, unit: 'hours' }, resolution: { value: 3, unit: 'business days' }, active: true },
  { id: 'p4', name: 'Low', color: '#22A954', description: 'Minor or non-urgent maintenance issue. Little to no impact on operations.', response: { value: 1, unit: 'business days' }, resolution: { value: 5, unit: 'business days' }, active: true },
];

// Maintenance requests (created by requesters, reviewed by managers)
export const REQUESTS = [
  {
    id: 'MR-2026-0046', requesterId: 'u1', requesterName: 'Alex Rivera',
    description: "The air conditioner in room 204 is not cooling. It's making a loud noise and the room is getting very hot.",
    location: 'Building A - Room 204', phone: '(555) 123-4567', email: 'alex.rivera@company.com',
    photos: ['/images/ac-ceiling-1.jpg', '/images/ac-ceiling-2.jpg'],
    submittedAt: '2026-09-03T10:24:00', status: 'Pending Review', priority: 'Medium', safety: false,
    ai: { category: 'Electrical', priority: 'Medium', trade: 'HVAC Technician', suggestedAction: 'Inspect AC unit, check refrigerant levels and filters. Schedule maintenance if needed.', safetyFlag: false, confidence: 92, analyzedAt: '2026-09-03T10:25:00' },
  },
  {
    id: 'MR-2026-0045', requesterId: 'u1', requesterName: 'Alex Rivera',
    description: 'AC not cooling in office', location: 'Building A - Room 201', phone: '(555) 123-4567', email: 'alex.rivera@company.com',
    photos: [], submittedAt: '2026-09-01T10:24:00', status: 'In Progress', priority: 'Medium', safety: false,
    ai: { category: 'HVAC', priority: 'Medium', trade: 'HVAC Technician', suggestedAction: 'Inspect AC unit and thermostat.', safetyFlag: false, confidence: 88, analyzedAt: '2026-09-01T10:25:00' },
  },
  {
    id: 'MR-2026-0044', requesterId: 'u1', requesterName: 'Alex Rivera',
    description: 'Broken cabinet handle', location: 'Building B - Room 101', phone: '(555) 123-4567', email: 'alex.rivera@company.com',
    photos: [], submittedAt: '2026-08-28T14:15:00', status: 'Completed', priority: 'Low', safety: false,
    ai: { category: 'General', priority: 'Low', trade: 'General Maintenance', suggestedAction: 'Replace cabinet handle.', safetyFlag: false, confidence: 95, analyzedAt: '2026-08-28T14:16:00' },
  },
  {
    id: 'MR-2026-0043', requesterId: 'u1', requesterName: 'Alex Rivera',
    description: 'Printer not working', location: 'Building A - Room 201', phone: '(555) 123-4567', email: 'alex.rivera@company.com',
    photos: [], submittedAt: '2026-08-27T11:40:00', status: 'Under Review', priority: 'Low', safety: false,
    ai: { category: 'General', priority: 'Low', trade: 'General Maintenance', suggestedAction: 'Check printer power and connectivity.', safetyFlag: false, confidence: 71, analyzedAt: '2026-08-27T11:41:00' },
  },
  {
    id: 'MR-2026-0042', requesterId: 'u1', requesterName: 'Alex Rivera',
    description: 'Sparking outlet in lab', location: 'Building C - Room 305', phone: '(555) 123-4567', email: 'alex.rivera@company.com',
    photos: [], submittedAt: '2026-09-02T14:15:00', status: 'Pending Review', priority: 'High', safety: true,
    ai: { category: 'Electrical', priority: 'High', trade: 'Electrician', suggestedAction: 'Isolate circuit immediately and replace outlet. Inspect wiring for damage.', safetyFlag: true, confidence: 96, analyzedAt: '2026-09-02T14:16:00' },
  },
  {
    id: 'MR-2026-0041', requesterId: 'u1', requesterName: 'Alex Rivera',
    description: 'Lights not working in hallway', location: 'Building A - Hallway', phone: '(555) 123-4567', email: 'alex.rivera@company.com',
    photos: [], submittedAt: '2026-09-02T11:40:00', status: 'Pending Review', priority: 'Medium', safety: false,
    ai: { category: 'Electrical', priority: 'Medium', trade: 'Electrician', suggestedAction: 'Check breaker and replace faulty fixtures or ballast.', safetyFlag: false, confidence: 90, analyzedAt: '2026-09-02T11:41:00' },
  },
  {
    id: 'MR-2026-0038', requesterId: 'u1', requesterName: 'Alex Rivera',
    description: 'Power outage in office', location: 'Building B - Room 305', phone: '(555) 123-4567', email: 'alex.rivera@company.com',
    photos: [], submittedAt: '2026-08-31T09:12:00', status: 'Pending Review', priority: 'High', safety: false,
    ai: { category: 'Electrical', priority: 'High', trade: 'Electrician', suggestedAction: 'Check panel breakers and restore power to affected circuits.', safetyFlag: false, confidence: 93, analyzedAt: '2026-08-31T09:13:00' },
  },
  {
    id: 'MR-2026-0036', requesterId: 'u1', requesterName: 'Alex Rivera',
    description: 'Wall switch not working', location: 'Building B - Room 101', phone: '(555) 123-4567', email: 'alex.rivera@company.com',
    photos: [], submittedAt: '2026-08-30T16:33:00', status: 'Pending Review', priority: 'Low', safety: false,
    ai: { category: 'Electrical', priority: 'Low', trade: 'Electrician', suggestedAction: 'Replace wall switch.', safetyFlag: false, confidence: 94, analyzedAt: '2026-08-30T16:34:00' },
  },
];

// Work orders (created by managers, completed by technicians)
export const WORK_ORDERS = [
  {
    id: 'WO-2026-0015', requestId: 'MR-2026-0046', title: 'Inspect and service AC unit', fullTitle: 'Inspect and service AC unit in Room 204',
    description: 'Inspect AC unit, check refrigerant levels and filters. Schedule maintenance if needed.',
    location: 'Building A - Room 204', category: 'HVAC', trade: 'HVAC Technician', priority: 'Medium', safety: false,
    technicianId: 'u3', scheduledAt: '2026-09-04T09:00:00', durationHours: 2, status: 'In Progress', image: '/images/ac-ceiling-1.jpg',
    checklist: [
      { id: 'c1', label: 'Inspect air filters', done: true },
      { id: 'c2', label: 'Check refrigerant levels', done: false },
      { id: 'c3', label: 'Test cooling output', done: false },
    ],
    parts: [{ name: 'AC Filter (ACF-001)', qty: 2 }, { name: 'R-410A Refrigerant', qty: 1 }],
    notes: [{ at: '2026-09-04T09:20:00', text: 'Started inspection. Filter needs replacement.' }],
  },
  {
    id: 'WO-2026-0018', requestId: null, title: 'HVAC filter replacement', fullTitle: 'HVAC filter replacement in Room 101',
    description: 'Replace HVAC filters as part of scheduled maintenance.', location: 'Building B - Room 101', category: 'HVAC', trade: 'HVAC Technician',
    priority: 'Low', safety: false, technicianId: 'u3', scheduledAt: '2026-09-04T10:30:00', durationHours: 1, status: 'Assigned', image: '/images/wo-filter.jpg',
    checklist: [{ id: 'c1', label: 'Remove old filters', done: false }, { id: 'c2', label: 'Install new filters', done: false }], parts: [{ name: 'AC Filter (ACF-001)', qty: 4 }], notes: [],
  },
  {
    id: 'WO-2026-0021', requestId: null, title: 'AC not cooling', fullTitle: 'AC not cooling in Room 305',
    description: 'Diagnose split AC unit not cooling.', location: 'Engineering Building - Room 305', category: 'HVAC', trade: 'HVAC Technician',
    priority: 'High', safety: false, technicianId: 'u3', scheduledAt: '2026-09-04T13:00:00', durationHours: 1.25, status: 'Scheduled', image: '/images/wo-split-ac.jpg',
    checklist: [{ id: 'c1', label: 'Check power supply', done: false }, { id: 'c2', label: 'Inspect compressor', done: false }], parts: [], notes: [],
  },
  {
    id: 'WO-2026-0023', requestId: null, title: 'Routine HVAC maintenance', fullTitle: 'Routine HVAC maintenance in Room 120',
    description: 'Quarterly preventive maintenance on HVAC system and thermostat calibration.', location: 'Building C - Room 120', category: 'HVAC', trade: 'HVAC Technician',
    priority: 'Low', safety: false, technicianId: 'u3', scheduledAt: '2026-09-04T15:00:00', durationHours: 1.25, status: 'Assigned', image: '/images/wo-thermostat.jpg',
    checklist: [{ id: 'c1', label: 'Calibrate thermostat', done: false }], parts: [], notes: [],
  },
  {
    id: 'WO-2026-0025', requestId: null, title: 'Unusual noise from AC unit', fullTitle: 'Unusual noise from rooftop AC unit',
    description: 'Investigate unusual noise reported from rooftop condenser.', location: 'Building A - Roof', category: 'HVAC', trade: 'HVAC Technician',
    priority: 'Medium', safety: false, technicianId: 'u3', scheduledAt: '2026-09-04T16:30:00', durationHours: 1, status: 'Assigned', image: '/images/wo-condenser.jpg',
    checklist: [{ id: 'c1', label: 'Inspect fan blades', done: false }], parts: [], notes: [],
  },
];

export const ASSETS = [
  { id: 'a1', tag: 'AC-204', name: 'Ceiling Cassette AC', type: 'HVAC', category: 'HVAC', brand: 'Daikin', model: 'FXZQ24', serial: 'DK2024001234', installDate: '2024-01-15', warrantyExpiry: '2029-01-15', building: 'Bldg A', room: 'Room 204', location: 'Building A - Room 204', locationDetail: 'Engineering Building, 2nd Floor', status: 'Operational', image: '/images/ac-204.jpg', locationImage: '/images/room-204.jpg',
    upcoming: [{ title: 'Filter Replacement', type: 'PM', status: 'Scheduled', date: '2026-09-15', note: 'Replace air filters and clean unit.' }],
    history: [{ id: 'WO-2026-0015', date: '2026-09-04', desc: 'Inspect and service AC unit', status: 'In Progress' }, { id: 'WO-2026-0008', date: '2026-08-12', desc: 'Replace faulty fan motor', status: 'Completed' }, { id: 'WO-2026-0003', date: '2026-07-28', desc: 'Clean coils and check refrigerant', status: 'Completed' }] },
  { id: 'a2', tag: 'AC-101', name: 'Split AC Unit', type: 'HVAC', category: 'HVAC', brand: 'Mitsubishi', model: 'MSZ-GL12', serial: 'MT2023004411', installDate: '2023-05-02', warrantyExpiry: '2028-05-02', building: 'Bldg B', room: 'Room 101', location: 'Building B - Room 101', locationDetail: 'Main Building, 1st Floor', status: 'Needs Maintenance', image: '/images/asset-ac-101.jpg', upcoming: [], history: [] },
  { id: 'a3', tag: 'GEN-001', name: 'Generator', type: 'Electrical', category: 'Electrical', brand: 'Generac', model: 'XT8000', serial: 'GN2022000871', installDate: '2022-03-10', warrantyExpiry: '2027-03-10', building: 'Bldg A', room: 'Ground Floor', location: 'Building A - Ground Floor', locationDetail: 'Engineering Building, Ground Floor', status: 'Operational', image: '/images/asset-gen-001.jpg', upcoming: [], history: [] },
  { id: 'a4', tag: 'ELEC-002', name: 'Main Distribution Panel', type: 'Electrical', category: 'Electrical', brand: 'Schneider', model: 'QED-2', serial: 'SC2021007720', installDate: '2021-09-01', warrantyExpiry: '2031-09-01', building: 'Bldg A', room: 'Electrical Room', location: 'Building A - Electrical Room', locationDetail: 'Engineering Building, Basement', status: 'Operational', image: '/images/asset-elec-002.jpg', upcoming: [], history: [] },
  { id: 'a5', tag: 'LGT-305', name: 'LED Light Fixture', type: 'Electrical', category: 'Electrical', brand: 'Philips', model: 'CoreLine', serial: 'PH2024015503', installDate: '2024-02-20', warrantyExpiry: '2029-02-20', building: 'Bldg C', room: 'Room 305', location: 'Building C - Room 305', locationDetail: 'Science Building, 3rd Floor', status: 'Operational', image: '/images/asset-lgt-305.jpg', upcoming: [], history: [] },
  { id: 'a6', tag: 'PMP-003', name: 'Water Pump', type: 'Plumbing', category: 'Plumbing', brand: 'Grundfos', model: 'CR 10', serial: 'GF2020003301', installDate: '2020-11-11', warrantyExpiry: '2025-11-11', building: 'Bldg B', room: 'Mechanical Room', location: 'Building B - Mechanical Room', locationDetail: 'Main Building, Basement', status: 'Needs Maintenance', image: '/images/asset-pmp-003.jpg', upcoming: [], history: [] },
  { id: 'a7', tag: 'FEX-010', name: 'Fire Extinguisher', type: 'Safety', category: 'Safety', brand: 'Amerex', model: 'B500', serial: 'AM2025001010', installDate: '2025-01-05', warrantyExpiry: '2031-01-05', building: 'Bldg A', room: 'Hallway', location: 'Building A - Hallway', locationDetail: 'Engineering Building, 2nd Floor', status: 'Operational', image: '/images/asset-fex-010.jpg', upcoming: [], history: [] },
  { id: 'a8', tag: 'AHU-120', name: 'Air Handling Unit', type: 'HVAC', category: 'HVAC', brand: 'Carrier', model: '39M', serial: 'CR2019001200', installDate: '2019-06-18', warrantyExpiry: '2024-06-18', building: 'Bldg C', room: 'Room 120', location: 'Building C - Room 120', locationDetail: 'Science Building, 1st Floor', status: 'Out of Service', image: '/images/asset-ahu-120.jpg', upcoming: [], history: [] },
  { id: 'a9', tag: 'STAT-201', name: 'Thermostat', type: 'HVAC', category: 'HVAC', brand: 'Honeywell', model: 'T6 Pro', serial: 'HW2024002010', installDate: '2024-04-09', warrantyExpiry: '2029-04-09', building: 'Bldg A', room: 'Room 201', location: 'Building A - Room 201', locationDetail: 'Engineering Building, 2nd Floor', status: 'Operational', image: '/images/asset-stat-201.jpg', upcoming: [], history: [] },
  { id: 'a10', tag: 'OUT-305', name: 'Power Outlet', type: 'Electrical', category: 'Electrical', brand: 'Leviton', model: 'T5320', serial: 'LV2023003050', installDate: '2023-08-14', warrantyExpiry: '2033-08-14', building: 'Bldg B', room: 'Room 305', location: 'Building B - Room 305', locationDetail: 'Main Building, 3rd Floor', status: 'Operational', image: '/images/asset-out-305.jpg', upcoming: [], history: [] },
];

// Notifications. `roles` controls which roles see each item.
export const NOTIFICATIONS = [
  { id: 'n1', type: 'Inventory', icon: 'alert', title: 'Low Stock Alert', text: 'AC Filter (ACF-001) is below reorder level (current: 4, reorder level: 10).', at: '2026-09-04T10:15:00', ago: '5 minutes ago', read: false, roles: ['manager', 'admin', 'technician'],
    detail: { kind: 'stock', item: { name: 'AC Filter', tag: 'HVAC', sku: 'ACF-001', unit: 'Each', image: '/images/ac-filter.jpg' }, current: 4, reorder: 10, suggested: 50, location: 'Building A - Room 204', locationDetail: 'Engineering Building, 2nd Floor', action: 'Create a purchase request to replenish AC filters. Suggested order quantity is 50 units based on usage history.' } },
  { id: 'n2', type: 'Work Orders', icon: 'clipboard', title: 'New Work Order Assigned', text: 'WO-2026-0027 has been assigned to you.', at: '2026-09-04T10:08:00', ago: '12 minutes ago', read: false, roles: ['manager', 'technician', 'admin'] },
  { id: 'n3', type: 'Maintenance', icon: 'calendar', title: 'Scheduled Maintenance Reminder', text: 'HVAC system maintenance is scheduled for Sep 15, 2026 at 09:00 AM.', at: '2026-09-04T09:20:00', ago: '1 hour ago', read: false, roles: ['manager', 'technician', 'admin'] },
  { id: 'n4', type: 'Work Orders', icon: 'check', title: 'Work Order Completed', text: 'WO-2026-0023 has been completed.', at: '2026-09-04T07:20:00', ago: '3 hours ago', read: true, roles: ['manager', 'admin'] },
  { id: 'n5', type: 'Work Orders', icon: 'clock', title: 'Work Order Pending Approval', text: 'WO-2026-0025 is awaiting manager approval.', at: '2026-09-04T05:20:00', ago: '5 hours ago', read: true, roles: ['manager', 'admin'] },
  { id: 'n6', type: 'Inventory', icon: 'box', title: 'Stock Received', text: '20 units of R-410A Refrigerant have been received.', at: '2026-09-03T10:00:00', ago: '1 day ago', read: true, roles: ['manager', 'admin', 'technician'] },
  { id: 'n7', type: 'Maintenance', icon: 'alert', title: 'Asset Offline', text: 'Generator (GEN-001) is showing no response.', at: '2026-09-03T08:00:00', ago: '1 day ago', read: true, roles: ['manager', 'admin', 'technician'] },
  { id: 'n8', type: 'System', icon: 'user', title: 'New User Created', text: 'A new user (Michael Carter) has been added to the system.', at: '2026-09-02T12:00:00', ago: '2 days ago', read: true, roles: ['manager', 'admin'] },
  { id: 'n9', type: 'Maintenance', icon: 'check', title: 'Maintenance Completed', text: 'Scheduled maintenance for AC-101 has been completed.', at: '2026-09-02T09:00:00', ago: '2 days ago', read: true, roles: ['manager', 'admin', 'technician'] },
  { id: 'n10', type: 'System', icon: 'info', title: 'System Maintenance', text: 'System maintenance is scheduled for Sep 10, 2026 from 12:00 AM to 2:00 AM.', at: '2026-09-01T09:00:00', ago: '3 days ago', read: true, roles: ['manager', 'admin', 'technician', 'requester'] },
  { id: 'n11', type: 'Work Orders', icon: 'check', title: 'Request Completed', text: 'Your request MR-2026-0044 (Broken cabinet handle) has been completed.', at: '2026-09-01T15:00:00', ago: '3 days ago', read: false, roles: ['requester'] },
  { id: 'n12', type: 'Work Orders', icon: 'clipboard', title: 'Request In Progress', text: 'A technician has started work on MR-2026-0045.', at: '2026-09-02T09:00:00', ago: '2 days ago', read: false, roles: ['requester'] },
  { id: 'n13', type: 'Work Orders', icon: 'clock', title: 'Request Under Review', text: 'MR-2026-0043 is being reviewed by the facilities team.', at: '2026-08-28T09:00:00', ago: '1 week ago', read: false, roles: ['requester'] },
];

export const EMERGENCY_PHONE = '(555) 123-4567';
