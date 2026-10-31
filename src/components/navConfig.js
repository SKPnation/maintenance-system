// Sidebar navigation per role. Groups render as labelled sections.
// `badge: 'queue' | 'notifications'` pulls a live count from the store.

export const NAV = {
  requester: {
    groups: [
      { items: [
        { label: 'Home', to: '/requester', icon: 'home', activeIcon: 'homeSolid', end: true },
        { label: 'New Request', to: '/requester/new', icon: 'filePlus', activeIcon: 'editDocSolid' },
        { label: 'My Requests', to: '/requester/requests', icon: 'fileText' },
      ] },
    ],
    notifications: { label: 'Notifications', to: '/requester/notifications', icon: 'bell' },
    bottom: [
      { label: 'Help & Support', to: '/requester/help', icon: 'help' },
    ],
  },
  manager: {
    groups: [
      { items: [{ label: 'Dashboard', to: '/manager/dashboard', icon: 'home' }] },
      { label: 'Operations', items: [
        { label: 'My Queue', to: '/manager/queue', icon: 'queueLine', activeIcon: 'queueSolid', badge: 'queue' },
        { label: 'AI Triage & Review', to: '/manager/triage', icon: 'fileText' },
        { label: 'Work Orders', to: '/manager/work-orders', icon: 'fileText' },
        { label: 'Calendar', to: '/manager/calendar', icon: 'calendar' },
      ] },
      { label: 'Resources', items: [
        { label: 'Technicians / Team', to: '/manager/team', icon: 'users' },
        { label: 'Assets', to: '/manager/assets', icon: 'box' },
      ] },
      { label: 'Insights', items: [{ label: 'Reports', to: '/manager/reports', icon: 'barChart' }] },
    ],
    notifications: { label: 'Notifications', to: '/manager/notifications', icon: 'bell' },
    bottom: [{ label: 'Settings', to: '/manager/settings', icon: 'settings' }],
  },
  technician: {
    groups: [
      { items: [{ label: 'Dashboard', to: '/technician/dashboard', icon: 'home' }] },
      { label: 'Work', items: [
        { label: 'My Tasks', to: '/technician/tasks', icon: 'taskLine', activeIcon: 'taskSolid' },
        { label: 'Calendar', to: '/technician/calendar', icon: 'calendar' },
      ] },
      { label: 'Resources', items: [
        { label: 'Assets', to: '/technician/assets', icon: 'box' },
        { label: 'Parts / Inventory', to: '/technician/inventory', icon: 'inventory' },
      ] },
    ],
    notifications: { label: 'Notifications', to: '/technician/notifications', icon: 'bell' },
    bottom: [{ label: 'Settings', to: '/technician/settings', icon: 'settings' }],
  },
  admin: {
    groups: [
      { items: [{ label: 'Dashboard', to: '/admin/dashboard', icon: 'home' }] },
      { label: 'Management', items: [
        { label: 'Users & Roles', to: '/admin/users', icon: 'users' },
        { label: 'Reports', to: '/admin/reports', icon: 'barChart' },
      ] },
      { label: 'Maintenance Configuration', tight: true, items: [
        { label: 'Categories', to: '/admin/categories', icon: 'folder' },
        { label: 'Priority Levels', to: '/admin/priority-levels', icon: 'flag' },
        { label: 'Trades', to: '/admin/trades', icon: 'wrench' },
        { label: 'Routing Rules', to: '/admin/routing-rules', icon: 'route' },
        { label: 'Locations', to: '/admin/locations', icon: 'mapPin' },
      ] },
      { label: 'System', items: [
        { label: 'System Settings', to: '/admin/system-settings', icon: 'settings' },
        { label: 'Audit Logs', to: '/admin/audit-logs', icon: 'fileText' },
      ] },
    ],
    notifications: { label: 'Notifications', to: '/admin/notifications', icon: 'bell' },
    notificationsInGroup: true, // admin mockup lists Notifications inside the System group
    bottom: [],
  },
};

// Search placeholder text in the top bar, per role
export const SEARCH_PLACEHOLDER = {
  requester: 'Search anything...',
  manager: 'Search requests, locations, or keywords...',
  technician: 'Search work orders, locations, or assets...',
  admin: 'Search requests, work orders, assets, or settings...',
};
