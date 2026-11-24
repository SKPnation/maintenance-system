import { useMemo, useState } from 'react';
import { Button, Select } from './ui.jsx';
import { localDateKey } from '../data/format.js';

const STATUSES = ['Unassigned', 'Assigned', 'In Progress', 'Completed', 'Cancelled'];
export const EMPTY_FILTERS = { category: '', priority: '', status: '', technician: '', date: '' };

const uniq = (values) => [...new Set(values.filter(Boolean))];

// PB-11: filters shared by the Manager Dashboard and Work Orders views.
export function useWorkOrderFilters(orders) {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const active = Object.values(filters).some(Boolean);

  const filtered = useMemo(() => orders.filter((w) =>
    (!filters.category || w.category === filters.category) &&
    (!filters.priority || w.priority === filters.priority) &&
    (!filters.status || w.status === filters.status) &&
    (!filters.technician || (filters.technician === '__none' ? !w.technicianId : w.technicianId === filters.technician)) &&
    (!filters.date || localDateKey(w.scheduledAt) === filters.date)), [orders, filters]);

  return { filters, setFilters, filtered, active, clear: () => setFilters(EMPTY_FILTERS) };
}

export function WorkOrderFilters({ orders, filters, setFilters, active, clear, categories = [], priorities = [], technicians = [] }) {
  const set = (key) => (e) => setFilters((f) => ({ ...f, [key]: e.target.value }));
  const techName = (id) => technicians.find((t) => t.id === id)?.name || 'Former technician';

  const categoryOptions = uniq([...categories, ...orders.map((w) => w.category)]);
  const priorityOptions = uniq([...priorities, ...orders.map((w) => w.priority)]);
  const statusOptions = uniq([...STATUSES, ...orders.map((w) => w.status)]);
  const techIds = uniq([...technicians.map((t) => t.id), ...orders.map((w) => w.technicianId)]);

  return (
    <div className="row gap-12 wrap" style={{ marginBottom: 16, alignItems: 'center' }}>
      <Select className="input-sm" style={{ width: 190 }} aria-label="Filter by category" placeholder="All categories" options={categoryOptions} value={filters.category} onChange={set('category')} />
      <Select className="input-sm" style={{ width: 160 }} aria-label="Filter by priority" placeholder="All priorities" options={priorityOptions} value={filters.priority} onChange={set('priority')} />
      <Select className="input-sm" style={{ width: 160 }} aria-label="Filter by status" placeholder="All statuses" options={statusOptions} value={filters.status} onChange={set('status')} />
      <Select className="input-sm" style={{ width: 190 }} aria-label="Filter by technician" placeholder="All technicians" options={[{ value: '__none', label: 'Unassigned' }, ...techIds.map((id) => ({ value: id, label: techName(id) }))]} value={filters.technician} onChange={set('technician')} />
      <div className="input input-sm" style={{ width: 170 }}><input type="date" aria-label="Scheduled date" value={filters.date} onChange={set('date')} /></div>
      {active && <Button variant="ghost" size="sm" icon="x" onClick={clear}>Clear filters</Button>}
    </div>
  );
}
