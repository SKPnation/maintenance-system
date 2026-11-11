import { useEffect, useState } from 'react';
import { Button, Field, Input, Select, Textarea } from './ui.jsx';
import { useStore } from '../context/StoreContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { fmtHours, fmtServiceWindow, localDateKey, toDate } from '../data/format.js';

const DURATIONS = ['0.5', '1', '1.5', '2', '3', '4', '6', '8'];
const CLOSED = ['Completed', 'Cancelled'];

const pad = (n) => String(n).padStart(2, '0');
const localTime = (v) => { const d = toDate(v); return d ? `${pad(d.getHours())}:${pad(d.getMinutes())}` : ''; };

// Same checks the server makes, so the manager sees problems before saving.
export function validateScheduleForm({ serviceDate, startTime, durationHours }, now = new Date()) {
  const errors = {};
  if (!serviceDate) errors.serviceDate = 'Pick a service date.';
  if (!startTime) errors.startTime = 'Pick a start time.';
  const hours = Number(durationHours);
  if (!durationHours || !Number.isFinite(hours) || hours <= 0 || hours > 24 || Math.round(hours * 4) !== hours * 4) {
    errors.durationHours = 'Enter 0.25–24 hours in 15-minute steps.';
  }
  if (!errors.serviceDate && !errors.startTime) {
    const start = new Date(`${serviceDate}T${startTime}`);
    if (Number.isNaN(start.getTime())) errors.serviceDate = 'Pick a valid date and time.';
    else if (start.getTime() < now.getTime() - 5 * 60000) errors.startTime = 'Pick a time in the future.';
  }
  return errors;
}

// Category Manager control for scheduling or rescheduling one work order (PB-06).
export function ScheduleForm({ workOrder, technicianName, onSaved, onCancel }) {
  const { scheduleWorkOrder } = useStore();
  const toast = useToast();
  const rescheduling = Boolean(workOrder.scheduledAt);
  const tomorrow = localDateKey(new Date(Date.now() + 86400000));

  const [form, setForm] = useState({
    serviceDate: localDateKey(workOrder.scheduledAt) || tomorrow,
    startTime: localTime(workOrder.scheduledAt) || '09:00',
    durationHours: workOrder.durationHours ? String(workOrder.durationHours) : '2',
    reason: '',
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const closed = CLOSED.includes(workOrder.status);
  const unassigned = !workOrder.technicianId;

  const durationOptions = DURATIONS.includes(form.durationHours) ? DURATIONS : [...DURATIONS, form.durationHours];

  const save = async () => {
    const e = validateScheduleForm(form);
    setErrors(e);
    setServerError('');
    if (Object.keys(e).length) return;
    setSaving(true);
    try {
      const result = await scheduleWorkOrder(workOrder.id, form);
      toast(result?.unchanged ? 'Schedule unchanged' : rescheduling ? 'Work order rescheduled' : 'Work order scheduled');
      onSaved?.(result);
    } catch (err) {
      // The existing schedule is untouched when the server rejects a change.
      setServerError(err.message || 'Could not save the schedule.');
    } finally {
      setSaving(false);
    }
  };

  if (closed) return <p className="muted">This work order is {workOrder.status.toLowerCase()} and can no longer be scheduled.</p>;
  if (unassigned) return <p className="muted">Assign a technician before scheduling this work order.</p>;

  return (
    <div className="stack gap-12">
      {rescheduling && (
        <div className="sched-current">
          <span className="muted">Current schedule</span>
          <strong>{fmtServiceWindow(workOrder.scheduledAt, workOrder.durationHours)}</strong>
        </div>
      )}
      <div className="muted" style={{ fontSize: 14 }}>Technician: <strong style={{ color: 'var(--text)' }}>{technicianName || 'Assigned technician'}</strong></div>
      <div className="form-grid-2">
        <Field label="Service date" required error={errors.serviceDate} htmlFor={`sd-${workOrder.id}`}>
          <Input id={`sd-${workOrder.id}`} icon="calendar" type="date" min={localDateKey(new Date())} value={form.serviceDate} onChange={set('serviceDate')} invalid={!!errors.serviceDate} />
        </Field>
        <Field label="Start time" required error={errors.startTime} htmlFor={`st-${workOrder.id}`}>
          <Input id={`st-${workOrder.id}`} icon="clock" type="time" step="900" value={form.startTime} onChange={set('startTime')} invalid={!!errors.startTime} />
        </Field>
      </div>
      <Field label="Estimated duration" required error={errors.durationHours} htmlFor={`du-${workOrder.id}`}>
        <Select id={`du-${workOrder.id}`} options={durationOptions.map((h) => ({ value: h, label: fmtHours(h) }))} value={form.durationHours} onChange={set('durationHours')} invalid={!!errors.durationHours} />
      </Field>
      {rescheduling && (
        <Field label="Reason for change (optional)" htmlFor={`rs-${workOrder.id}`}>
          <Textarea id={`rs-${workOrder.id}`} rows={2} style={{ minHeight: 54 }} maxLength={500} placeholder="e.g. Parts arriving Thursday" value={form.reason} onChange={set('reason')} />
        </Field>
      )}
      {serverError && <div className="form-alert" role="alert">{serverError}</div>}
      <div className="row gap-12" style={{ justifyContent: 'flex-end' }}>
        {onCancel && <Button variant="secondary" onClick={onCancel} disabled={saving}>Cancel</Button>}
        <Button icon="calendar" onClick={save} disabled={saving}>{saving ? 'Saving…' : rescheduling ? 'Reschedule' : 'Schedule'}</Button>
      </div>
    </div>
  );
}

// Previous → new schedule log for a work order.
export function ScheduleHistory({ workOrderId, refreshKey }) {
  const { listScheduleHistory } = useStore();
  const [entries, setEntries] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let live = true;
    setError('');
    listScheduleHistory(workOrderId)
      .then((rows) => live && setEntries(rows))
      .catch((e) => live && setError(e.message));
    return () => { live = false; };
  }, [workOrderId, refreshKey]);

  if (error) return <p className="field-error">{error}</p>;
  if (!entries) return <p className="muted" style={{ fontSize: 14 }}>Loading schedule history…</p>;
  if (!entries.length) return <p className="muted" style={{ fontSize: 14 }}>No schedule changes yet.</p>;

  return (
    <div className="stack gap-8">
      {[...entries].reverse().map((h) => (
        <div key={h.id} className="note-item">
          <div className="tl-meta">
            {h.action === 'rescheduled' ? 'Rescheduled' : 'Scheduled'} · {toDate(h.changedAt)?.toLocaleString() || 'Just now'}{h.changedByName ? ` · ${h.changedByName}` : ''}
          </div>
          {h.previous && <div><span className="muted">From </span><s>{fmtServiceWindow(h.previous.scheduledAt, h.previous.durationHours)}</s></div>}
          <div><span className="muted">{h.previous ? 'To ' : ''}</span>{fmtServiceWindow(h.next?.scheduledAt, h.next?.durationHours)}</div>
          {h.reason && <div className="muted">Reason: {h.reason}</div>}
        </div>
      ))}
    </div>
  );
}
