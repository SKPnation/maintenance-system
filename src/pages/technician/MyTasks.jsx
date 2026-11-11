import { useEffect, useMemo, useState } from 'react';
import Icon from '../../components/Icon.jsx';
import { Button, Card, EmptyState, Field, Pill, PriorityPill, Select, StatCard, StatusPill, Tabs, Textarea } from '../../components/ui.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useStore } from '../../context/StoreContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { fmtDate, fmtDateTime, fmtHours, fmtLongDay, fmtServiceWindow, hourLabel, sameDay, toDate } from '../../data/format.js';

const STATUS_FILTERS = ['All Statuses', 'Assigned', 'In Progress', 'Completed'];
const EV_TONE = { 'In Progress': 'blue', Assigned: 'amber', Completed: 'green' };
const TAG_TONE = { 'In Progress': 'solid-blue', Assigned: 'amber', Completed: 'green' };

// PB-08: the only moves a technician can make.
const NEXT_ACTION = {
  Assigned: { status: 'In Progress', label: 'Start Work', icon: 'arrowRight' },
  'In Progress': { status: 'Completed', label: 'Mark as Complete', icon: 'check' },
};

// Timeline geometry
const START_HOUR = 7;
const END_HOUR = 19;
const HOUR_PX = 57;

const at = (v) => toDate(v)?.getTime() ?? 0;

// Open on today if there is work today, else the next upcoming job, else the most recent one.
function pickStartDay(list) {
  const now = new Date();
  const dated = list.filter((w) => w.scheduledAt);
  if (dated.some((w) => sameDay(w.scheduledAt, now))) return now;
  const sorted = [...dated].sort((a, b) => at(a.scheduledAt) - at(b.scheduledAt));
  const upcoming = sorted.find((w) => at(w.scheduledAt) > now.getTime());
  const pick = upcoming || sorted[sorted.length - 1];
  return pick ? toDate(pick.scheduledAt) : now;
}

export default function MyTasks() {
  const { user } = useAuth();
  const { workOrders, updateWorkOrderStatus } = useStore();
  const toast = useToast();

  const mine = useMemo(() => workOrders.filter((w) => w.technicianId === user.id), [workOrders, user.id]);
  const [day, setDay] = useState(() => pickStartDay(mine));
  const [view, setView] = useState('Day');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [selectedId, setSelectedId] = useState(null);
  const [busy, setBusy] = useState('');

  const inRange = (w) => {
    const d = toDate(w.scheduledAt);
    if (!d) return false;
    if (view === 'Day') return sameDay(d, day);
    if (view === 'Week') { const s = new Date(day); s.setHours(0, 0, 0, 0); s.setDate(s.getDate() - s.getDay()); const e = new Date(s); e.setDate(s.getDate() + 7); return d >= s && d < e; }
    return d.getMonth() === day.getMonth() && d.getFullYear() === day.getFullYear();
  };

  const matches = (w) => statusFilter === 'All Statuses' || w.status === statusFilter;
  const visible = mine.filter(inRange).sort((a, b) => at(a.scheduledAt) - at(b.scheduledAt));
  const listed = visible.filter(matches);
  const unscheduled = mine.filter((w) => !w.scheduledAt && w.status !== 'Completed').filter(matches);
  const today = mine.filter((w) => sameDay(w.scheduledAt, day));
  const selected = mine.find((w) => w.id === selectedId) || listed[0] || unscheduled[0] || null;

  const now = new Date();
  const stats = {
    assigned: today.length,
    inProgress: mine.filter((w) => w.status === 'In Progress').length,
    completed: mine.filter((w) => w.status === 'Completed').length,
    overdue: mine.filter((w) => w.status !== 'Completed' && w.scheduledAt && at(w.scheduledAt) + Number(w.durationHours || 0) * 3600000 < now.getTime()).length,
  };

  const shift = (dir) => {
    const d = new Date(day);
    if (view === 'Day') d.setDate(d.getDate() + dir);
    else if (view === 'Week') d.setDate(d.getDate() + 7 * dir);
    else d.setMonth(d.getMonth() + dir);
    setDay(d);
  };

  const changeStatus = async (wo, status) => {
    setBusy(wo.id);
    try {
      await updateWorkOrderStatus(wo.id, status);
      toast(status === 'Completed' ? 'Work order marked as complete' : 'Work started');
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setBusy('');
    }
  };

  const row = (w) => (
    <div key={w.id} role="button" tabIndex={0} className={`wo-row ${w.id === selected?.id ? 'is-selected' : ''}`} onClick={() => setSelectedId(w.id)} onKeyDown={(e) => e.key === 'Enter' && setSelectedId(w.id)}>
      {w.image ? <img className="wo-img" src={w.image} alt="" /> : <div className="wo-img" />}
      <div className="wo-body">
        <div className="row between" style={{ alignItems: 'flex-start' }}>
          <div className="wo-title">{w.title}</div>
          <div className="row gap-8"><StatusPill status={w.status} size="sm" /><PriorityPill priority={w.priority} size="sm" /></div>
        </div>
        <div className="wo-meta"><Icon name="mapPin" size={16} strokeWidth={2} />{w.location || 'Location not set'}</div>
        <div className="wo-meta"><Icon name="calendar" size={16} strokeWidth={2} />{w.scheduledAt ? fmtServiceWindow(w.scheduledAt, w.durationHours) : 'Not scheduled yet'}</div>
      </div>
    </div>
  );

  return (
    <div className="page-inner">
      <header className="page-header">
        <div>
          <h1 className="page-title">My Tasks</h1>
          <p className="page-subtitle">Your assigned work orders, schedule, status and notes.</p>
        </div>
        <div className="page-actions" style={{ paddingTop: 10 }}>
          <div className="date-nav">
            <button type="button" onClick={() => shift(-1)} aria-label="Previous"><Icon name="chevronLeft" size={16} strokeWidth={2.4} /></button>
            <div className="date-label">{fmtDate(day)}</div>
            <button type="button" onClick={() => shift(1)} aria-label="Next"><Icon name="chevronRight" size={16} strokeWidth={2.4} /></button>
          </div>
          <div className="segmented" role="group" aria-label="Range">
            {['Day', 'Week', 'Month'].map((v) => <button key={v} type="button" className={view === v ? 'on' : ''} onClick={() => setView(v)} aria-pressed={view === v}>{v}</button>)}
          </div>
        </div>
      </header>

      <div className="stats" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 232px))' }}>
        <StatCard tone="blue" icon="clipboard" value={stats.assigned} label="Scheduled" sub={sameDay(day, now) ? 'Today' : fmtDate(day)} />
        <StatCard tone="amber" icon="alarm" value={stats.inProgress} label="In Progress" />
        <StatCard tone="green" icon="check" value={stats.completed} label="Completed" />
        <StatCard tone="red" icon="alertCircle" iconStyle="solid" value={stats.overdue} label="Overdue" />
      </div>

      <div className="tasks-cols">
        <Card title="Schedule" icon="calendar" action={<span className="muted" style={{ fontSize: 13.5 }}>{fmtLongDay(day)}</span>}>
          <div className="schedule" style={{ height: (END_HOUR - START_HOUR) * HOUR_PX + 30, marginTop: 6 }}>
            <div className="sched-rail" />
            {Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => (
              <div key={i} className="hour" style={{ top: 12 + i * HOUR_PX }}><span>{hourLabel(START_HOUR + i)}</span></div>
            ))}
            {today.map((w) => {
              const d = toDate(w.scheduledAt);
              const offset = Math.min(Math.max(d.getHours() + d.getMinutes() / 60 - START_HOUR, 0), END_HOUR - START_HOUR - 0.5);
              const height = Math.max(62, Number(w.durationHours || 1) * HOUR_PX - 8);
              return (
                <button key={w.id} type="button" className={`ev ev-${EV_TONE[w.status] || 'gray'} ${w.id === selected?.id ? 'is-selected' : ''}`} style={{ top: 12 + offset * HOUR_PX, height }} onClick={() => setSelectedId(w.id)}>
                  <span className="row between"><span className="ev-id">{d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span><Pill tone={TAG_TONE[w.status] || 'gray'} size="sm">{w.status}</Pill></span>
                  <span>{w.title}</span>
                  <span>{w.location}</span>
                </button>
              );
            })}
          </div>
        </Card>

        <Card
          title={`Work Orders (${listed.length + unscheduled.length})`}
          icon="list"
          bodyClass="flush"
          action={<Select className="input-sm" style={{ width: 150 }} options={STATUS_FILTERS} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filter by status" />}
        >
          {listed.length + unscheduled.length === 0 ? (
            <EmptyState icon="taskLine" title="No work orders" text={`Nothing ${statusFilter === 'All Statuses' ? '' : statusFilter.toLowerCase() + ' '}scheduled for this ${view.toLowerCase()}.`} />
          ) : (
            <div className="wo-list">
              {unscheduled.length > 0 && <div className="wo-group">Waiting for a service time ({unscheduled.length})</div>}
              {unscheduled.map(row)}
              {unscheduled.length > 0 && listed.length > 0 && <div className="wo-group">Scheduled this {view.toLowerCase()}</div>}
              {listed.map(row)}
            </div>
          )}
        </Card>

        <section className="card">
          {selected ? (
            <WorkOrderDetail key={selected.id} wo={selected} busy={busy === selected.id} onStatus={(s) => changeStatus(selected, s)} />
          ) : (
            <EmptyState icon="clipboard" title="Select a work order" text="Pick a job from your schedule or list to see details." />
          )}
        </section>
      </div>
    </div>
  );
}

function WorkOrderDetail({ wo, busy, onStatus }) {
  const [tab, setTab] = useState('details');
  const next = NEXT_ACTION[wo.status];
  const instructions = Array.isArray(wo.notes) ? wo.notes : [];

  return (
    <div className="detail-panel">
      <div className="row gap-12 wrap">
        <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.3px' }}>{wo.title}</span>
      </div>
      <div className="row gap-8 wrap"><StatusPill status={wo.status} size="sm" /><PriorityPill priority={wo.priority} size="sm" />{wo.safety && <Pill tone="red" size="sm">Safety</Pill>}</div>

      <Tabs
        variant="soft"
        tabs={[
          { key: 'details', label: 'Details' },
          { key: 'notes', label: `Notes${wo.noteCount ? ` (${wo.noteCount})` : ''}` },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'details' && (
        <>
          <dl className="kv" style={{ gridTemplateColumns: '130px 1fr', fontSize: 14, gap: 10 }}>
            <dt>Location</dt><dd>{wo.location || 'Not set'}</dd>
            <dt>Service time</dt><dd>{wo.scheduledAt ? fmtServiceWindow(wo.scheduledAt, wo.durationHours) : <span className="muted">Not scheduled yet</span>}</dd>
            <dt>Est. duration</dt><dd>{fmtHours(wo.durationHours)}</dd>
            <dt>Trade</dt><dd>{wo.trade || '—'}</dd>
            <dt>Status updated</dt><dd>{fmtDateTime(wo.statusUpdatedAt || wo.updatedAt)}</dd>
          </dl>
          <div>
            <div className="section-title" style={{ fontSize: 14 }}>Description</div>
            <p className="muted" style={{ fontSize: 13.5, lineHeight: '21px', marginTop: 2 }}>{wo.description}</p>
          </div>
          {instructions.length > 0 && (
            <div className="stack gap-8">
              <div className="section-title" style={{ fontSize: 14 }}>Manager instructions</div>
              {instructions.map((n, i) => <div key={i} className="note-item">{n.text}</div>)}
            </div>
          )}
        </>
      )}

      {tab === 'notes' && <NotesPanel wo={wo} />}

      <div className="stack gap-8" style={{ marginTop: 8 }}>
        <div className="section-title" style={{ fontSize: 14 }}>Status</div>
        {next ? (
          <Button icon={next.icon} className="btn-block" disabled={busy} onClick={() => onStatus(next.status)}>
            {busy ? 'Saving…' : next.label}
          </Button>
        ) : (
          <p className="muted" style={{ fontSize: 14 }}>{wo.status === 'Completed' ? 'This work order is complete. You can still add a completion note.' : 'No status change available.'}</p>
        )}
      </div>
    </div>
  );
}

// PB-09: internal progress and completion notes for the assigned technician.
function NotesPanel({ wo }) {
  const { listWorkOrderNotes, addWorkOrderNote } = useStore();
  const toast = useToast();
  const [notes, setNotes] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [text, setText] = useState('');
  const [kind, setKind] = useState(wo.status === 'Completed' ? 'completion' : 'progress');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => listWorkOrderNotes(wo.id).then(setNotes).catch((e) => setLoadError(e.message));
  useEffect(() => { load(); }, [wo.id, wo.noteCount]);

  const save = async () => {
    if (!text.trim()) { setError('Write a note before saving.'); return; }
    setError('');
    setSaving(true);
    try {
      await addWorkOrderNote(wo.id, text, kind);
      setText('');
      toast('Note saved');
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="stack gap-12">
      <div className="stack gap-8">
        {loadError && <p className="field-error">{loadError}</p>}
        {!notes && !loadError && <p className="muted" style={{ fontSize: 14 }}>Loading notes…</p>}
        {notes?.length === 0 && <p className="muted" style={{ fontSize: 14 }}>No notes yet.</p>}
        {notes?.map((n) => (
          <div key={n.id} className="note-item">
            <div className="tl-meta">
              <strong>{n.kind === 'completion' ? 'Completion' : 'Progress'}</strong> · {n.authorName || 'Technician'} · {fmtDateTime(n.createdAt)}
            </div>
            <div style={{ whiteSpace: 'pre-wrap' }}>{n.text}</div>
          </div>
        ))}
      </div>
      <div className="stack gap-8">
        <div className="segmented" role="group" aria-label="Note type" style={{ height: 34 }}>
          {[['progress', 'Progress'], ['completion', 'Completion']].map(([k, label]) => (
            <button key={k} type="button" className={kind === k ? 'on' : ''} aria-pressed={kind === k} onClick={() => setKind(k)} style={{ fontSize: 13.5 }}>{label}</button>
          ))}
        </div>
        <Field htmlFor={`note-${wo.id}`} error={error} hint="Internal — visible to you and your category manager, not the requester.">
          <Textarea id={`note-${wo.id}`} rows={3} maxLength={2000} placeholder={kind === 'completion' ? 'What was repaired and the final result…' : 'Work performed so far…'} value={text} onChange={(e) => setText(e.target.value)} invalid={!!error} />
        </Field>
        <Button size="sm" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Note'}</Button>
      </div>
    </div>
  );
}
