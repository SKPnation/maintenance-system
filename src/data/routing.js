// Mirrors maintenance-functions/routing.js so admins can preview routing.

export const FALLBACK_CATEGORY = 'General Maintenance';

export const DEFAULT_CATEGORIES = [
  { name: 'Appliance/Equipment', description: 'Appliances and building equipment such as refrigerators, washers, elevators and pumps.', defaultManager: 'Appliance Manager' },
  { name: 'Electrical', description: 'Power, lighting, outlets, breakers and wiring.', defaultManager: 'Electrical Category Manager' },
  { name: 'HVAC', description: 'Heating, ventilation, air conditioning and thermostats.', defaultManager: 'Electrical Category Manager' },
  { name: 'Information Technology', description: 'Computers, network, Wi-Fi, printers, projectors and connected devices.', defaultManager: 'IT Manager' },
  { name: FALLBACK_CATEGORY, description: 'Requests with no valid category match. Reviewed manually.', defaultManager: '' },
];

export const normalize = (value) => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
export const isFallback = (name) => normalize(name) === normalize(FALLBACK_CATEGORY);

export function resolveRoute(categoryName, categories) {
  const fallback = categories.find((c) => isFallback(c.name));
  const toFallback = (reason) => ({
    category: fallback ? fallback.name : FALLBACK_CATEGORY,
    managerId: fallback && fallback.active !== false && fallback.managerId ? fallback.managerId : null,
    fallback: true,
    reason,
  });
  const match = categories.find((c) => normalize(c.name) === normalize(categoryName));
  if (!match) return toFallback(categoryName ? 'unknown' : 'missing');
  if (match.active !== true) return toFallback('inactive');
  if (!match.managerId) return toFallback('unmapped');
  return { category: match.name, managerId: match.managerId, fallback: isFallback(match.name), reason: 'matched' };
}

// Preselect managers for the default categories: by name, then by the manager's own category.
export function suggestDefaults(managers) {
  const pick = (def) => {
    const hint = normalize(def.defaultManager);
    const byName = hint && managers.find((m) => normalize(m.name) === hint);
    const byCategory = managers.find((m) => normalize(m.category) === normalize(def.name));
    return (byName || byCategory || {}).id || '';
  };
  return DEFAULT_CATEGORIES.map((def) => ({ name: def.name, description: def.description, active: true, managerId: pick(def), defaultManager: def.defaultManager }));
}
