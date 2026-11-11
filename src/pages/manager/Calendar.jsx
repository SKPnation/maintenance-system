import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Icon from '../../components/Icon.jsx';
import { Button, Card, EmptyState, Modal, PageHeader, PriorityPill, Select, StatusPill } from '../../components/ui.jsx';
import { ScheduleForm, ScheduleHistory } from '../../components/Scheduling.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useStore } from '../../context/StoreContext.jsx';
import { fmtDate, fmtHours, sameDay, toDate } from '../../data/format.js';

const CLOSED = ['Completed', 'Cancelled'];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const startOfWeek = (d) => { const s = new Date(d); s.setHours(0, 0, 0, 0); s.setDate(s.getDate() - s.getDay()); return s; };
const timeLabel = (v) => toDate(v)?.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) || '';

// Manager Calendar (PB-06): week of scheduled jobs plus assigned work still waiting for a time.
export default function ManagerCalendar() {
  const { user } = useAuth();
  const { workOrders = [], technicians = [] } = useStore();
  const [params, setParams] = useSearchParams();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [techFilter, setTechFilter] = useState('');
  const [historyKey, setHistoryKey] = useState(0);

  const techName = (id) => technicians.find((t) => t.id === id)?.name || (id ? 'Technician' : 'Unassigned');
  const mine = useMemo(() => workOrders.filter((w) => w.category === user?.category && (!techFilter || w.technicianId === techFilter)), [workOrders, user?.category, techFilter]);

  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(weekStart); d.setDate(d.getDate() + i); return d; });
  const weekEnd = days[6];
  const scheduled = mine.filter((w) => w.scheduledAt).sort((a, b) => toDate(a.scheduledAt) - toDate(b.scheduledAt));
  const needsTime = mine.filter((w) => !w.scheduledAt && w.technicianId && !CLOSED.includes(w.status));
  const unassigned = mine.filter((w) => !w.technicianId && !CLOSED.includes(w.status));

  const selectedId = params.get('wo');
  const selected = workOrders.find((w) => w.id === selectedId);
  const open = (id) => setParams(id ? { wo: id } : {});
  const shift = (weeks) => setWeekStart((d) => { const n = new Date(d); n.setDate(n.getDate() + weeks * 7); return n; });

  return (
    <div className="page-inner">
      <PageHeader
        title="Calendar"
        subtitle={`Scheduled work for ${user?.category || 'your category'}. Select a job to schedule or reschedule it.`}
        actions={(
          <div className="row gap-12 wrap">
            <Select className="input-sm" style={{ width: 200 }} aria-label="Filter by technician" placeholder="All technicians" options={technicians.map((t) => ({ value: t.id, label: t.name }))} value={techFilter} onChange={(e) => setTechFilter(e.target.value)} />
            <div className="date-nav">
              <button type="button" onClick={() => shift(-1)} aria-label="Previous week"><Icon name="chevronLeft" size={16} strokeWidth={2.4} /></button>
              <div className="date-label" style={{ width: 200 }}>{fmtDate(days[0])} – {fmtDate(weekEnd).replace(/, \d{4}$/, '')}</div>
              <button type="button" onClick={() => shift(1)} aria-label="Next week"><Icon name="chevronRight" size={16} strokeWidth={2.4} /></button>
            </div>
            <Button variant="secondary" size="sm" onClick={() => setWeekStart(startOfWeek(new Date()))}>This week</Button>
          </div>
        )}
      />

      <div className="cal-layout">
        <section className="card cal-week" aria-label="Week view">
          {days.map((d) => {
            const jobs = scheduled.filter((w) => sameDay(w.scheduledAt, d));
            return (
              <div key={d.toISOString()} className={`cal-day ${sameDay(d, new Date()) ? 'is-today' : ''}`}>
                <div className="cal-day-head"><span>{DAY_NAMES[d.getDay()]}</span><strong>{d.getDate()}</strong></div>
                <div className="cal-day-body">
                  {jobs.length === 0 && <div className="cal-empty">—</div>}
                  {jobs.map((w) => (
                    <button key={w.id} type="button" className={`cal-ev cal-ev-${(w.status || '').replace(/\s/g, '').toLowerCase()}`} onClick={() => open(w.id)}>
                      <span className="cal-ev-time">{timeLabel(w.scheduledAt)} · {fmtHours(w.durationHours)}</span>
                      <span className="cal-ev-title">{w.title}</span>
                      <span className="cal-ev-meta">{techName(w.technicianId)} · {w.status}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </section>

        <div className="stack gap-16">
          <Card title={`Needs scheduling (${needsTime.length})`} icon="clock">
            {needsTime.length === 0 ? <p className="muted" style={{ padding: '4px 0 8px', fontSize: 14 }}>Every assigned work order has a time.</p> : (
              <div className="stack">
                {needsTime.map((w) => (
                  <button key={w.id} type="button" className="cal-todo" onClick={() => open(w.id)}>
                    <span><strong>{w.title}</strong><span className="muted"> · {techName(w.technicianId)}</span></span>
                    <PriorityPill priority={w.priority} size="sm" />
                  </button>
                ))}
              </div>
            )}
          </Card>
          {unassigned.length > 0 && (
            <div className="info-card"><Icon name="info" size={22} /><div style={{ fontSize: 14 }}>{unassigned.length} work order{unassigned.length === 1 ? ' needs' : 's need'} a technician before scheduling. Assign one from <Link className="link" to="/manager/work-orders">Work Orders</Link>.</div></div>
          )}
        </div>
      </div>

      {selectedId && (
        <Modal title={selected ? selected.title : 'Work order'} onClose={() => open(null)}>
          {!selected ? <EmptyState title="Work order not found" text="It may belong to another category." /> : (
            <div className="stack gap-16">
              <div className="row gap-12 wrap"><StatusPill status={selected.status} size="sm" /><PriorityPill priority={selected.priority} size="sm" /><span className="muted" style={{ fontSize: 14 }}>{selected.location}</span></div>
              <ScheduleForm key={`${selected.id}-${selected.scheduledAt}`} workOrder={selected} technicianName={techName(selected.technicianId)} onSaved={() => setHistoryKey((k) => k + 1)} onCancel={() => open(null)} />
              <div>
                <div className="section-title" style={{ fontSize: 14, marginBottom: 8 }}>Schedule history</div>
                <ScheduleHistory workOrderId={selected.id} refreshKey={`${historyKey}-${selected.scheduledAt}`} />
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
