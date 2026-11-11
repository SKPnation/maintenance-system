import { useMemo, useState } from 'react';
import { Button, Card, EmptyState, Modal, PageHeader, PriorityPill, Select, StatusPill } from '../../components/ui.jsx';
import { ScheduleForm, ScheduleHistory } from '../../components/Scheduling.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useStore } from '../../context/StoreContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { fmtServiceWindow, localDateKey } from '../../data/format.js';
import { tradesMatch } from '../../data/trades.js';

const CLOSED = ['Completed', 'Cancelled'];

export default function WorkOrders() {
  const { user } = useAuth();
  const { workOrders = [], technicians = [], assignTechnician } = useStore();
  const toast = useToast();
  const [saving, setSaving] = useState('');
  const [filters, setFilters] = useState({ priority: '', status: '', technician: '', date: '' });
  const [scheduling, setScheduling] = useState(null);
  const category = user?.category;

  const myOrders = useMemo(() => workOrders.filter((w) => category && w.category === category), [workOrders, category]);
  const filtered = myOrders.filter((w) =>
    (!filters.priority || w.priority === filters.priority) &&
    (!filters.status || w.status === filters.status) &&
    (!filters.technician || w.technicianId === filters.technician) &&
    (!filters.date || localDateKey(w.scheduledAt) === filters.date));
  const techName = (id) => technicians.find((t) => t.id === id)?.name || '';
  const options = (key) => [...new Set(myOrders.map((w) => (key === 'technician' ? w.technicianId : w[key])).filter(Boolean))]
    .map((v) => ({ value: v, label: key === 'technician' ? techName(v) || v : v }));
  const selected = workOrders.find((w) => w.id === scheduling);

  async function assign(w, technicianId) {
    setSaving(w.id);
    try {
      await assignTechnician(w.id, technicianId);
      toast(technicianId ? `Assigned to ${techName(technicianId)}` : 'Technician removed');
    } catch (e) { toast(e.message, 'error'); } finally { setSaving(''); }
  }

  return (
    <div className="page-inner">
      <PageHeader
        title={`${category || 'Manager'} Work Orders`}
        subtitle="Assign technicians and schedule approved work. Requests awaiting review appear in My Queue."
        actions={<Button variant="secondary" icon="calendar" to="/manager/calendar">Open Calendar</Button>}
      />
      <Card>
        <div className="row gap-12 wrap" style={{ marginBottom: 16 }}>
          {['priority', 'status', 'technician'].map((k) => (
            <Select key={k} className="input-sm" style={{ width: 180 }} aria-label={`Filter by ${k}`} placeholder={`All ${k === 'status' ? 'statuses' : k === 'priority' ? 'priorities' : 'technicians'}`} options={options(k)} value={filters[k]} onChange={(e) => setFilters({ ...filters, [k]: e.target.value })} />
          ))}
          <div className="input input-sm" style={{ width: 180 }}><input type="date" aria-label="Scheduled date" value={filters.date} onChange={(e) => setFilters({ ...filters, date: e.target.value })} /></div>
        </div>
        {filtered.length === 0 ? (
          <EmptyState icon="fileText" title="No work orders" text={myOrders.length ? 'No work orders match these filters.' : `No work orders created for ${category || 'your category'} yet.`} />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Work order</th><th>Priority</th><th>Status</th><th>Technician</th><th>Service time</th><th /></tr></thead>
              <tbody>
                {filtered.map((w) => {
                  const closed = CLOSED.includes(w.status);
                  return (
                    <tr key={w.id}>
                      <td style={{ maxWidth: 300 }}><div style={{ fontWeight: 600 }}>{w.title || 'Maintenance work order'}</div><div className="sub">{w.location}</div></td>
                      <td><PriorityPill priority={w.priority} size="sm" /></td>
                      <td><StatusPill status={w.status} size="sm" /></td>
                      <td>
                        <TechnicianSelect w={w} technicians={technicians} disabled={saving === w.id || closed} onChange={(id) => assign(w, id)} />
                      </td>
                      <td>{w.scheduledAt ? fmtServiceWindow(w.scheduledAt, w.durationHours) : <span className="muted">Not scheduled</span>}</td>
                      <td>
                        <Button size="sm" variant={w.scheduledAt ? 'secondary' : 'primary'} disabled={closed || !w.technicianId} title={!w.technicianId ? 'Assign a technician first' : undefined} onClick={() => setScheduling(w.id)}>
                          {w.scheduledAt ? 'Reschedule' : 'Schedule'}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {selected && (
        <Modal title={`${selected.scheduledAt ? 'Reschedule' : 'Schedule'}: ${selected.title}`} onClose={() => setScheduling(null)}>
          <ScheduleForm workOrder={selected} technicianName={techName(selected.technicianId)} onSaved={() => setScheduling(null)} onCancel={() => setScheduling(null)} />
          {selected.scheduledAt && (
            <div>
              <div className="section-title" style={{ fontSize: 14, marginBottom: 8 }}>Schedule history</div>
              <ScheduleHistory workOrderId={selected.id} refreshKey={selected.scheduledAt} />
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

// Only technicians whose trade matches the work order, so the choice will be accepted.
function TechnicianSelect({ w, technicians, disabled, onChange }) {
  const qualified = technicians.filter((t) => tradesMatch(t.trade, w.trade) || t.id === w.technicianId);
  return (
    <div className="stack" style={{ gap: 4 }}>
      <Select
        className="input-sm"
        style={{ width: 210 }}
        aria-label={`Technician for ${w.title}`}
        disabled={disabled}
        placeholder="Unassigned"
        options={qualified.map((t) => ({ value: t.id, label: `${t.name} (${t.trade || 'no trade'})` }))}
        value={w.technicianId || ''}
        onChange={(e) => onChange(e.target.value)}
      />
      {qualified.length === 0 && <span className="sub">No active {w.trade || 'matching'} technicians</span>}
    </div>
  );
}
