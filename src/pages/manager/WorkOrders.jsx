import { useState } from 'react';
import { Button, Card, EmptyState, Modal, PageHeader, PriorityPill, Select, StatusPill } from '../../components/ui.jsx';
import { ScheduleForm, ScheduleHistory } from '../../components/Scheduling.jsx';
import { useWorkOrderFilters, WorkOrderFilters } from '../../components/WorkOrderFilters.jsx';
import { useStore } from '../../context/StoreContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { fmtServiceWindow } from '../../data/format.js';
import { useManagerScope } from '../../data/managerScope.js';
import { hasTrade, technicianTrades } from '../../data/trades.js';

const CLOSED = ['Completed', 'Cancelled'];

export default function WorkOrders() {
  const { technicians = [], assignTechnician, priorityNames = [] } = useStore();
  const { workOrders: myOrders, categories, label } = useManagerScope();
  const toast = useToast();
  const [saving, setSaving] = useState('');
  const [scheduling, setScheduling] = useState(null);
  const filterState = useWorkOrderFilters(myOrders);
  const { filtered, active, clear } = filterState;

  const techName = (id) => technicians.find((t) => t.id === id)?.name || '';
  const selected = myOrders.find((w) => w.id === scheduling);

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
        title="Work Orders"
        badge={<span className="muted" style={{ fontSize: 15 }}>{label}</span>}
        subtitle="Assign technicians and schedule approved work. Requests awaiting review appear in My Queue."
        actions={<Button variant="secondary" icon="calendar" to="/manager/calendar">Open Calendar</Button>}
      />
      <Card>
        <WorkOrderFilters orders={myOrders} {...filterState} categories={categories} priorities={priorityNames} technicians={technicians} />
        {filtered.length === 0 ? (
          <EmptyState
            icon="fileText"
            title={active ? 'No matching work orders' : 'No work orders yet'}
            text={active ? 'No work orders match these filters.' : `No work orders have been created for ${label} yet.`}
            action={active ? <Button variant="secondary" size="sm" onClick={clear}>Clear filters</Button> : null}
          />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Work order</th><th>Category</th><th>Priority</th><th>Status</th><th>Technician</th><th>Service time</th><th /></tr></thead>
              <tbody>
                {filtered.map((w) => {
                  const closed = CLOSED.includes(w.status);
                  return (
                    <tr key={w.id}>
                      <td style={{ maxWidth: 300 }}><div style={{ fontWeight: 600 }}>{w.title || 'Maintenance work order'}</div><div className="sub">{w.location}</div></td>
                      <td style={{ whiteSpace: 'nowrap' }}>{w.category || '—'}</td>
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
  const qualified = technicians.filter((t) => hasTrade(t, w.trade) || t.id === w.technicianId);
  return (
    <div className="stack" style={{ gap: 4 }}>
      <Select
        className="input-sm"
        style={{ width: 210 }}
        aria-label={`Technician for ${w.title}`}
        disabled={disabled}
        placeholder="Unassigned"
        options={qualified.map((t) => ({ value: t.id, label: `${t.name} (${technicianTrades(t).join(', ') || 'no trade'})` }))}
        value={w.technicianId || ''}
        onChange={(e) => onChange(e.target.value)}
      />
      {qualified.length === 0 && <span className="sub">No active {w.trade || 'matching'} technicians</span>}
    </div>
  );
}
