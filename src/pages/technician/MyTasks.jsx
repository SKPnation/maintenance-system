import { useMemo, useState } from 'react';
import Icon from '../../components/Icon.jsx';
import {
  Button, Card, Checkbox, EmptyState, Field, KebabButton, Pill, PriorityPill, Select, StatCard, StatusPill, Tabs, Textarea,
} from '../../components/ui.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useStore } from '../../context/StoreContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { fmtDate, fmtDateTime, fmtLongDay, hourLabel, sameDay } from '../../data/format.js';

const STATUS_FILTERS = ['All Statuses', 'Assigned', 'Scheduled', 'In Progress', 'On Hold', 'Completed'];
const STATUS_OPTIONS = ['Assigned', 'Scheduled', 'In Progress', 'On Hold', 'Completed'];
const EV_TONE = { 'In Progress': 'blue', Assigned: 'amber', Scheduled: 'gray', Completed: 'green', 'On Hold': 'gray' };
const TAG_TONE = { 'In Progress': 'solid-blue', Assigned: 'amber', Scheduled: 'gray', Completed: 'green', 'On Hold': 'gray' };

// Timeline geometry
const START_HOUR = 8;
const END_HOUR = 17;
const HOUR_PX = 57;

// Open on today if there is work today, else the next upcoming job, else the most recent one.
function pickStartDay(list) {
  const now = new Date();
  if (list.some((w) => sameDay(w.scheduledAt, now))) return now;
  const sorted = [...list].sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
  const upcoming = sorted.find((w) => new Date(w.scheduledAt) > now);
  const pick = upcoming || sorted[sorted.length - 1];
  return pick ? new Date(pick.scheduledAt) : now;
}

export default function MyTasks() {
  const { user } = useAuth();
  const { workOrders, requests, updateWorkOrder, addWorkNote } = useStore();
  const [noteDraft,setNoteDraft]=useState({});
  const toast = useToast();

  const mine = useMemo(() => workOrders.filter((w) => w.technicianId === user.id), [workOrders, user.id]);
  const [day, setDay] = useState(() => pickStartDay(mine));
  const [view, setView] = useState('Day');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [selectedId, setSelectedId] = useState(() => mine.find((w) => sameDay(w.scheduledAt, pickStartDay(mine)))?.id ?? null);

  const inRange = (w) => {
    const d = new Date(w.scheduledAt);
    if (view === 'Day') return sameDay(d, day);
    if (view === 'Week') { const s = new Date(day); s.setDate(day.getDate() - day.getDay()); const e = new Date(s); e.setDate(s.getDate() + 7); return d >= s && d < e; }
    return d.getMonth() === day.getMonth() && d.getFullYear() === day.getFullYear();
  };

  const visible = mine.filter(inRange).sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
  const listed = visible.filter((w) => statusFilter === 'All Statuses' || w.status === statusFilter);
  const today = mine.filter((w) => sameDay(w.scheduledAt, day));
  const selected = mine.find((w) => w.id === selectedId);

  const now = new Date();
  const stats = {
    assigned: today.length,
    inProgress: mine.filter((w) => w.status === 'In Progress').length,
    completed: mine.filter((w) => w.status === 'Completed').length,
    overdue: mine.filter((w) => w.status !== 'Completed' && w.scheduledAt && new Date(w.scheduledAt).getTime() + w.durationHours * 3600000 < now.getTime() && !sameDay(w.scheduledAt, now)).length,
  };

  const shift = (dir) => {
    const d = new Date(day);
    if (view === 'Day') d.setDate(d.getDate() + dir);
    else if (view === 'Week') d.setDate(d.getDate() + 7 * dir);
    else d.setMonth(d.getMonth() + dir);
    setDay(d);
  };

  return (
    <div className="page-inner">
      {mine.filter(w=>!w.scheduledAt).length>0 && <section className="card" style={{padding:20,marginBottom:18}}><h3>Unscheduled assigned work</h3>{mine.filter(w=>!w.scheduledAt).map(w=><div key={w.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:12,borderBottom:'1px solid #eee'}}><span><strong>{w.title}</strong> — {w.status}</span><span><button className="btn" disabled={w.status!=='Assigned'} onClick={()=>Promise.resolve(updateWorkOrder(w.id,{status:'In Progress'})).catch(e=>toast(e.message,'error'))}>Start</button> <button className="btn" disabled={w.status!=='In Progress'} onClick={()=>Promise.resolve(updateWorkOrder(w.id,{status:'Completed'})).catch(e=>toast(e.message,'error'))}>Complete</button></span></div>)}</section>}

      <section className="card" style={{padding:20,marginBottom:18}}><h3>Work-order progress & completion notes</h3>{mine.map(w=><div key={w.id} style={{padding:12,borderBottom:'1px solid #ddd'}}><strong>{w.title}</strong> · {w.status}<div>{(w.notes||[]).map((n,i)=><p key={i}><small>{n.author||n.by||'Technician'} · {n.at&&new Date(n.at).toLocaleString()} · Internal</small><br/>{n.text}</p>)}</div><textarea aria-label={'Note for '+w.title} value={noteDraft[w.id]||''} onChange={e=>setNoteDraft(x=>({...x,[w.id]:e.target.value}))} placeholder="Internal progress or completion note"/><button onClick={async()=>{try{await addWorkNote(w.id,noteDraft[w.id]);setNoteDraft(x=>({...x,[w.id]:''}))}catch(e){toast(e.message,'error')}}}>Save note</button></div>)}</section>
      <header className="page-header">
        <div>
          <h1 className="page-title">My Tasks</h1>
          <p className="page-subtitle">View and manage your assigned work orders.</p>
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
          <Button icon="plus" onClick={() => selected ? document.getElementById('status-select')?.focus() : toast('Select a work order first.', 'error')}>Update Status</Button>
        </div>
      </header>

      <div className="stats" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 232px))' }}>
        <StatCard tone="blue" icon="clipboard" value={stats.assigned} label="Assigned" sub={sameDay(day, now) ? 'Today' : fmtDate(day)} />
        <StatCard tone="amber" icon="alarm" value={stats.inProgress} label="In Progress" />
        <StatCard tone="green" icon="check" value={stats.completed} label="Completed" sub="This Week" />
        <StatCard tone="red" icon="alertCircle" iconStyle="solid" value={stats.overdue} label="Overdue" />
      </div>

      <div className="tasks-cols">
        {/* ---- Schedule ---- */}
        <Card title="Today's Schedule" icon="calendar" action={<span className="muted" style={{ fontSize: 13.5 }}>{fmtLongDay(day)}</span>}>
          <div className="schedule" style={{ height: (END_HOUR - START_HOUR) * HOUR_PX + 30, marginTop: 6 }}>
            <div className="sched-rail" />
            {Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => (
              <div key={i} className="hour" style={{ top: 12 + i * HOUR_PX }}><span>{hourLabel(START_HOUR + i)}</span></div>
            ))}
            {today.map((w) => {
              const d = new Date(w.scheduledAt);
              const top = 12 + (d.getHours() + d.getMinutes() / 60 - START_HOUR) * HOUR_PX;
              const height = Math.max(62, w.durationHours * HOUR_PX - 8);
              return (
                <button key={w.id} type="button" className={`ev ev-${EV_TONE[w.status]} ${w.id === selectedId ? 'is-selected' : ''}`} style={{ top, height }} onClick={() => setSelectedId(w.id)}>
                  <span className="row between"><span className="ev-id">{w.id}</span><Pill tone={TAG_TONE[w.status]} size="sm">{w.status}</Pill></span>
                  <span>{w.title}</span>
                  <span>{w.location}</span>
                </button>
              );
            })}
          </div>
        </Card>

        {/* ---- Work orders ---- */}
        <Card
          title={`Work Orders (${visible.length})`}
          icon="list"
          bodyClass="flush"
          action={<Select className="input-sm" style={{ width: 142 }} options={STATUS_FILTERS} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filter by status" />}
        >
          {listed.length === 0 ? (
            <EmptyState icon="taskLine" title="No work orders" text={`Nothing ${statusFilter === 'All Statuses' ? '' : statusFilter.toLowerCase() + ' '}scheduled for this ${view.toLowerCase()}.`} />
          ) : (
            <div className="wo-list">
              {listed.map((w) => (
                <div key={w.id} role="button" tabIndex={0} className={`wo-row ${w.id === selectedId ? 'is-selected' : ''}`} onClick={() => setSelectedId(w.id)} onKeyDown={(e) => e.key === 'Enter' && setSelectedId(w.id)}>
                  {w.image ? <img className="wo-img" src={w.image} alt="" /> : <div className="wo-img" />}
                  <div className="wo-body">
                    <div className="row between" style={{ alignItems: 'flex-start' }}>
                      <div><div className="wo-id">{w.id}</div><div className="wo-title" style={{ marginTop: 4 }}>{w.title}</div></div>
                      <div className="row gap-12"><PriorityPill priority={w.priority} size="sm" /><KebabButton onClick={(e) => e.stopPropagation()} /></div>
                    </div>
                    <div className="wo-meta"><Icon name="mapPin" size={16} strokeWidth={2} />{w.location}</div>
                    <div className="wo-meta"><Icon name="calendar" size={16} strokeWidth={2} />{fmtDateTime(w.scheduledAt)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* ---- Detail ---- */}
        <section className="card">
          {selected ? (
            <WorkOrderDetail
              key={selected.id}
              wo={selected}
              request={requests.find((r) => r.id === selected.requestId)}
              onUpdate={(changes, msg) => { Promise.resolve(updateWorkOrder(selected.id, changes)).then(()=>toast(msg)).catch(e=>toast(e.message,'error')); }}
            />
          ) : (
            <EmptyState icon="clipboard" title="Select a work order" text="Pick a job from your schedule or list to see details." />
          )}
        </section>
      </div>
    </div>
  );
}

function WorkOrderDetail({ wo, request, onUpdate }) {
  const [tab, setTab] = useState('details');
  const [status, setStatus] = useState(wo.status);
  const [note, setNote] = useState('');
  const [newPart, setNewPart] = useState('');

  const save = () => {
    const notes = note.trim() ? [...wo.notes, { at: new Date().toISOString(), text: note.trim() }] : wo.notes;
    onUpdate({ status, notes }, `${wo.id} updated`);
    setNote('');
  };

  return (
    <div className="detail-panel">
      <div className="row gap-16 wrap">
        <span style={{ fontSize: 19, fontWeight: 700, letterSpacing: '-0.3px' }}>{wo.id}</span>
        <PriorityPill priority={wo.priority} size="sm" />
        <StatusPill status={wo.status} size="sm" />
      </div>
      <div className="muted" style={{ fontSize: 14, marginTop: -4 }}>{wo.fullTitle}</div>

      <Tabs
        variant="soft"
        tabs={[
          { key: 'details', label: 'Details' },
          { key: 'checklist', label: `Checklist (${wo.checklist.length})` },
          { key: 'parts', label: `Parts (${wo.parts.length})` },
          { key: 'notes', label: `Notes (${wo.notes.length})` },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'details' && (
        <>
          <div className="row gap-20" style={{ alignItems: 'flex-start', marginTop: 4 }}>
            {wo.image && <img className="photo" src={wo.image} alt="" style={{ width: 102, height: 118 }} />}
            <div className="stack gap-8" style={{ fontSize: 14 }}>
              <div><div className="muted" style={{ fontSize: 13.5 }}>Location</div><div className="inline-icon" style={{ marginTop: 4 }}><Icon name="mapPin" size={16} strokeWidth={2} />{wo.location}</div></div>
              <div><div className="muted" style={{ fontSize: 13.5 }}>Scheduled Date</div><div className="inline-icon" style={{ marginTop: 4 }}><Icon name="calendar" size={16} strokeWidth={2} />{fmtDateTime(wo.scheduledAt)}</div></div>
              <div><div className="muted" style={{ fontSize: 13.5 }}>Estimated Duration</div><div className="inline-icon" style={{ marginTop: 4 }}><Icon name="clock" size={16} strokeWidth={2} />{wo.durationHours} hour{wo.durationHours === 1 ? '' : 's'}</div></div>
            </div>
          </div>
          <div>
            <div className="section-title" style={{ fontSize: 14 }}>Description</div>
            <p className="muted" style={{ fontSize: 13.5, lineHeight: '21px', marginTop: 2 }}>{wo.description}</p>
          </div>
          {request && (
            <>
              <div className="divider" />
              <div className="row between">
                <span className="section-title" style={{ fontSize: 14 }}>Original Request</span>
                <span className="link" style={{ fontSize: 14 }}>{request.id}</span>
              </div>
              <div className="desc-box">{request.description}</div>
            </>
          )}
        </>
      )}

      {tab === 'checklist' && (
        wo.checklist.length === 0 ? <EmptyState icon="taskLine" title="No checklist" text="This work order has no checklist items." /> : (
          <div className="checklist">
            {wo.checklist.map((c) => (
              <Checkbox key={c.id} id={`${wo.id}-${c.id}`} checked={c.done} label={c.label}
                onChange={(v) => onUpdate({ checklist: wo.checklist.map((x) => (x.id === c.id ? { ...x, done: v } : x)) }, v ? `"${c.label}" done` : `"${c.label}" reopened`)} />
            ))}
          </div>
        )
      )}

      {tab === 'parts' && (
        <div className="stack gap-12">
          <div className="parts-list">
            {wo.parts.length === 0 && <p className="muted" style={{ fontSize: 14 }}>No parts recorded yet.</p>}
            {wo.parts.map((p) => <div key={p.name}><span>{p.name}</span><span className="muted">× {p.qty}</span></div>)}
          </div>
          <div className="row gap-8">
            <input className="input" style={{ flex: 1, height: 36, fontSize: 14 }} placeholder="Add part used..." value={newPart} onChange={(e) => setNewPart(e.target.value)} />
            <Button size="sm" variant="secondary" disabled={!newPart.trim()} onClick={() => { onUpdate({ parts: [...wo.parts, { name: newPart.trim(), qty: 1 }] }, 'Part added'); setNewPart(''); }}>Add</Button>
          </div>
        </div>
      )}

      {tab === 'notes' && (
        <div className="stack gap-8">
          {wo.notes.length === 0 && <p className="muted" style={{ fontSize: 14 }}>No notes yet. Add one with a status update below.</p>}
          {wo.notes.map((n) => <div key={n.at} className="note-item"><div className="tl-meta">{fmtDateTime(n.at)}</div>{n.text}</div>)}
        </div>
      )}

      <div className="stack gap-8" style={{ marginTop: 8 }}>
        <div className="section-title" style={{ fontSize: 14 }}>Status Update</div>
        <Field label="Status" htmlFor="status-select">
          <Select id="status-select" className="input-sm" options={STATUS_OPTIONS} value={status} onChange={(e) => setStatus(e.target.value)} />
        </Field>
        <Field label="Notes (Optional)" htmlFor="tech-note">
          <Textarea id="tech-note" rows={2} style={{ minHeight: 54, fontSize: 13.5 }} placeholder="e.g. Started inspection. Filter needs replacement." value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
      </div>

      <div className="row gap-12" style={{ marginTop: 6 }}>
        <Button onClick={save} disabled={status === wo.status && !note.trim()}>Save Update</Button>
        <Button variant="outline" icon="check" className="btn-block" style={{ flex: 1 }} disabled={wo.status === 'Completed'} onClick={() => { setStatus('Completed'); onUpdate({ status: 'Completed' }, `${wo.id} marked as complete`); }}>
          Mark as Complete
        </Button>
      </div>
    </div>
  );
}

