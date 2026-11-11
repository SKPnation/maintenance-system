import { useEffect, useState } from 'react';
import Icon from '../../components/Icon.jsx';
import {
  Button, Card, Field, IconButton, Input, Modal, PageHeader, Pill, Select, StatCard, Textarea, Toggle,
} from '../../components/ui.jsx';
import { useStore } from '../../context/StoreContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { fmtDuration } from '../../data/format.js';
import { configured } from '../../firebase.js';

const COLORS = [
  { value: '#EF4444', label: 'Red' }, { value: '#F97316', label: 'Orange' }, { value: '#FBBF24', label: 'Yellow' },
  { value: '#22A954', label: 'Green' }, { value: '#1D6AF0', label: 'Blue' }, { value: '#7C3AED', label: 'Purple' }, { value: '#64748B', label: 'Slate' },
];
const UNITS = ['minutes', 'hours', 'business days'];

// Soft background + text color for the level chip, derived from the base color.
const CHIP = {
  '#EF4444': ['#FDE0E0', '#DC2626'], '#F97316': ['#FDEBD9', '#C2410C'], '#FBBF24': ['#FDF1C4', '#854D0E'],
  '#22A954': ['#DDF4E6', '#15803D'], '#1D6AF0': ['#DCE8FC', '#1D4ED8'], '#7C3AED': ['#EDE6FC', '#6D28D9'], '#64748B': ['#E6EAF0', '#334155'],
};
const STAT = { Critical: ['red', 'alertCircle'], High: ['orange', 'alertCircle'], Medium: ['amber', 'clockCircle'], Low: ['green', 'checkCircle'] };

const blank = () => ({ id: `p${Date.now()}`, name: '', color: '#1D6AF0', description: '', response: { value: 1, unit: 'hours' }, resolution: { value: 1, unit: 'business days' }, active: true, isNew: true });

export default function PriorityLevels() {
  const { priorities, prioritiesSaved, savePriority, deletePriority, importPriorities } = useStore();
  const toast = useToast();
  const [editing, setEditing] = useState(() => ({ ...priorities[0] }));
  const [errors, setErrors] = useState({});
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [busy, setBusy] = useState(false);

  // Levels arrive from Firestore after the first render; keep the form pointed at a real level.
  useEffect(() => {
    if (!editing.isNew && !priorities.some((p) => p.id === editing.id) && priorities[0]) setEditing({ ...priorities[0] });
  }, [priorities.map((p) => p.id).join()]);

  const importToDatabase = async () => {
    setBusy(true);
    try {
      const { count } = await importPriorities();
      toast(`${count} priority levels saved to the database`);
    } catch (e) { toast(e.message, 'error'); } finally { setBusy(false); }
  };

  const set = (k, v) => setEditing((e) => ({ ...e, [k]: v }));
  const setTime = (k, part, v) => setEditing((e) => ({ ...e, [k]: { ...e[k], [part]: part === 'value' ? Number(v) : v, label: undefined } }));

  const select = (p) => { setEditing({ ...p }); setErrors({}); };

  const save = async () => {
    const e = {};
    if (!editing.name.trim()) e.name = 'Enter a name.';
    else if (priorities.some((p) => p.id !== editing.id && p.name.toLowerCase() === editing.name.trim().toLowerCase())) e.name = 'A priority level with this name already exists.';
    if (!editing.description.trim()) e.description = 'Describe when this priority applies.';
    if (editing.response.value < 0 || editing.resolution.value <= 0) e.time = 'Enter valid target times.';
    setErrors(e);
    if (Object.keys(e).length) return;
    const { isNew, ...clean } = editing;
    const level = { ...clean, name: clean.name.trim(), description: clean.description.trim() };
    setBusy(true);
    try {
      const result = await savePriority({ ...level, isNew });
      setEditing({ ...level, id: result?.id || level.id });
      toast(isNew ? `${level.name} added` : `${level.name} saved`);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (p) => {
    setConfirmDelete(null);
    try {
      await deletePriority(p.id);
      toast(`${p.name} deleted`);
      const next = priorities.find((x) => x.id !== p.id);
      if (next) select(next);
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const original = priorities.find((p) => p.id === editing.id);

  return (
    <div className="page-inner">
      <div className="review-grid" style={{ gridTemplateColumns: 'minmax(0,1fr) 472px', gap: 18 }}>
        <div className="stack gap-20">
          <PageHeader
            breadcrumbs={[{ label: 'Settings' }, { label: 'Maintenance Configuration' }, { label: 'Priority Levels' }]}
            title="Priority Levels"
            subtitle="Configure the priority levels used for maintenance requests and work orders in your organization."
          />

          {configured && !prioritiesSaved && (
            <div className="info-card" role="status" style={{ alignItems: 'center' }}>
              <Icon name="info" size={24} />
              <div style={{ flex: 1, fontSize: 14 }}>
                <strong>These levels are only saved in this browser.</strong> Save them to the database so the AI, managers and the server all use them. You can keep editing afterwards.
              </div>
              <Button icon="save" onClick={importToDatabase} disabled={busy}>{busy ? 'Saving…' : 'Save to database'}</Button>
            </div>
          )}

          <div className="stats" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
            {priorities.slice(0, 4).map((p) => {
              const [tone, icon] = STAT[p.name] || ['blue', 'infoCircle'];
              return <StatCard key={p.id} tone={`${tone} stat-level`} icon={icon} iconStyle="solid" value={p.active ? 1 : 0} label={p.name} sub={p.active ? 'Active' : 'Inactive'} />;
            })}
          </div>

          <Card title={`Priority Levels (${priorities.length})`} icon="list" bodyClass="flush" action={<Button icon="plus" onClick={() => { setEditing(blank()); setErrors({}); }}>Add Priority Level</Button>}>
            <div style={{ overflowX: 'auto', borderTop: '1px solid var(--line)', marginTop: -4 }}>
              <table className="table" style={{ fontSize: 13.5 }}>
                <thead>
                  <tr>
                    <th style={{ background: '#fff' }}>Name</th><th style={{ background: '#fff' }}>Color</th><th style={{ background: '#fff' }}>Description / Criteria</th>
                    <th style={{ background: '#fff' }}>Target<br />Response Time</th><th style={{ background: '#fff' }}>Target<br />Resolution Time</th><th style={{ background: '#fff' }}>Status</th><th style={{ background: '#fff' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {priorities.map((p) => {
                    const [bg, fg] = CHIP[p.color] || ['#E6EAF0', '#334155'];
                    return (
                      <tr key={p.id} className={`clickable ${p.id === editing.id ? 'is-selected' : ''}`} onClick={() => select(p)} style={{ height: 104 }}>
                        <td><span className="lvl" style={{ background: bg, color: fg }}>{p.name}</span></td>
                        <td><span className="swatch" style={{ background: p.color }} /></td>
                        <td style={{ maxWidth: 190, lineHeight: '19.5px', color: 'var(--text-3)' }}>{p.description}</td>
                        <td style={{ color: 'var(--text-3)', lineHeight: '19.5px' }}>
                          {p.response.label ? <><span style={{ color: 'var(--text)' }}>Immediate</span><br />(0 – 15 minutes)</> : fmtDuration(p.response)}
                        </td>
                        <td style={{ color: 'var(--text-3)' }}>{fmtDuration(p.resolution)}</td>
                        <td>{p.active ? <Pill tone="green">Active</Pill> : <Pill tone="gray">Inactive</Pill>}</td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <div className="row gap-8">
                            <IconButton icon="edit" label={`Edit ${p.name}`} tone="blue" onClick={() => select(p)} />
                            <IconButton icon="trash" label={`Delete ${p.name}`} tone="red" onClick={() => setConfirmDelete(p)} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <div className="stack gap-16" style={{ paddingTop: 8 }}>
          <div className="info-card">
            <Icon name="info" size={26} />
            <div>
              <div className="info-title">How Priority Levels are used</div>
              <p className="info-text">These priority levels and definitions are provided to the AI when analyzing new requests. They are also used by managers and technicians to ensure consistent classification, response times, and resolution targets.</p>
            </div>
          </div>

          <Card title={editing.isNew ? 'Add Priority Level' : 'Edit Priority Level'} icon="settings">
            <div className="stack gap-16">
              <Field label="Name" required htmlFor="pl-name" error={errors.name}>
                <Input id="pl-name" value={editing.name} onChange={(e) => set('name', e.target.value)} invalid={!!errors.name} placeholder="e.g. Urgent" />
              </Field>
              <Field label="Color" required>
                <div className="input select" style={{ height: 46 }}>
                  <span className="swatch" style={{ width: 28, height: 28, borderRadius: 14, background: editing.color }} />
                  <select value={editing.color} onChange={(e) => set('color', e.target.value)} aria-label="Color">
                    {COLORS.map((c) => <option key={c.value} value={c.value}>{c.value} - {c.label}</option>)}
                  </select>
                  <Icon name="chevronDown" size={16} strokeWidth={2.4} className="select-caret" />
                </div>
              </Field>
              <Field label="Description / Criteria" required htmlFor="pl-desc" error={errors.description}>
                <Textarea id="pl-desc" rows={3} value={editing.description} onChange={(e) => set('description', e.target.value)} invalid={!!errors.description} />
              </Field>
              <Field label="Target Response Time" required hint="Expected time to acknowledge and respond.">
                <div className="form-grid-2" style={{ gap: 12 }}>
                  <Input type="number" min="0" value={editing.response.value} onChange={(e) => setTime('response', 'value', e.target.value)} aria-label="Response value" />
                  <Select options={UNITS} value={editing.response.unit} onChange={(e) => setTime('response', 'unit', e.target.value)} aria-label="Response unit" />
                </div>
              </Field>
              <Field label="Target Resolution Time" required hint="Expected time to complete the work." error={errors.time}>
                <div className="form-grid-2" style={{ gap: 12 }}>
                  <Input type="number" min="1" value={editing.resolution.value} onChange={(e) => setTime('resolution', 'value', e.target.value)} aria-label="Resolution value" />
                  <Select options={UNITS} value={editing.resolution.unit} onChange={(e) => setTime('resolution', 'unit', e.target.value)} aria-label="Resolution unit" />
                </div>
              </Field>
              <Field label="Status">
                <div className="row gap-12" style={{ alignItems: 'flex-start' }}>
                  <Toggle checked={editing.active} onChange={(v) => set('active', v)} label="Active" />
                  <div style={{ paddingTop: 4 }}>
                    <div style={{ fontSize: 15, fontWeight: 500 }}>{editing.active ? 'Active' : 'Inactive'}</div>
                    <div className="field-hint" style={{ fontSize: 12.5, marginTop: 6 }}>Inactive priority levels will not be used by the AI or shown in forms.</div>
                  </div>
                </div>
              </Field>
              <div className="row gap-16" style={{ marginTop: 10 }}>
                {!editing.isNew && <Button variant="danger" icon="trash" onClick={() => setConfirmDelete(original)} style={{ width: 150, height: 46 }}>Delete</Button>}
                <Button variant="secondary" onClick={() => (original ? select(original) : select(priorities[0]))} style={{ height: 46 }}>Cancel</Button>
                <Button onClick={save} disabled={busy} style={{ flex: 1, height: 46, fontSize: 15.5 }}>{editing.isNew ? 'Add Level' : 'Save Changes'}</Button>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {confirmDelete && (
        <Modal
          title={`Delete "${confirmDelete.name}"?`}
          onClose={() => setConfirmDelete(null)}
          actions={<><Button variant="secondary" onClick={() => setConfirmDelete(null)}>Cancel</Button><Button variant="danger" icon="trash" onClick={() => remove(confirmDelete)}>Delete</Button></>}
        >
          <p>Levels already used by requests or work orders can't be deleted. Mark them inactive instead, so they stop being offered for new work.</p>
        </Modal>
      )}
    </div>
  );
}
