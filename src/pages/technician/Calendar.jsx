import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../components/Icon.jsx';
import { Button, Card, PageHeader, PriorityPill } from '../../components/ui.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useStore } from '../../context/StoreContext.jsx';
import { fmtDate, fmtHours, sameDay, toDate } from '../../data/format.js';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const startOfWeek = (d) => { const s = new Date(d); s.setHours(0, 0, 0, 0); s.setDate(s.getDate() - s.getDay()); return s; };
const timeLabel = (v) => toDate(v)?.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) || '';

// Technician Calendar: a read-only week of the signed-in technician's scheduled jobs.
export default function TechnicianCalendar() {
  const { user } = useAuth();
  const { workOrders = [] } = useStore();
  const navigate = useNavigate();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));

  const mine = useMemo(() => workOrders.filter((w) => w.technicianId === user.id), [workOrders, user.id]);
  const scheduled = mine.filter((w) => w.scheduledAt).sort((a, b) => toDate(a.scheduledAt) - toDate(b.scheduledAt));
  const waiting = mine.filter((w) => !w.scheduledAt && w.status !== 'Completed');

  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(weekStart); d.setDate(d.getDate() + i); return d; });
  const shift = (weeks) => setWeekStart((d) => { const n = new Date(d); n.setDate(n.getDate() + weeks * 7); return n; });
  const open = (id) => navigate(`/technician/tasks?wo=${encodeURIComponent(id)}`);

  return (
    <div className="page-inner">
      <PageHeader
        title="Calendar"
        subtitle="Your scheduled assignments. Select a job to open it in My Tasks."
        actions={(
          <div className="row gap-12 wrap">
            <div className="date-nav">
              <button type="button" onClick={() => shift(-1)} aria-label="Previous week"><Icon name="chevronLeft" size={16} strokeWidth={2.4} /></button>
              <div className="date-label" style={{ width: 200 }}>{fmtDate(days[0])} – {fmtDate(days[6]).replace(/, \d{4}$/, '')}</div>
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
                      <span className="cal-ev-meta">{w.location || 'Location not set'} · {w.status}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </section>

        <Card title={`Waiting for a time (${waiting.length})`} icon="clock">
          {waiting.length === 0 ? <p className="muted" style={{ fontSize: 14 }}>All your open jobs are scheduled.</p> : (
            <div className="stack">
              {waiting.map((w) => (
                <button key={w.id} type="button" className="cal-todo" onClick={() => open(w.id)}>
                  <span><strong>{w.title}</strong><span className="muted"> · {w.status}</span></span>
                  <PriorityPill priority={w.priority} size="sm" />
                </button>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
