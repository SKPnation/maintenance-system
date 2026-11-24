import { useState } from 'react';
import { Button, Card, EmptyState, Field, Input, Modal, PageHeader, Pill, Select, Textarea } from '../../components/ui.jsx';
import RoutingSetup from '../../components/RoutingSetup.jsx';
import { useStore } from '../../context/StoreContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { configured } from '../../firebase.js';
import { isFallback } from '../../data/routing.js';

const BLANK = { name: '', description: '', active: true, managerId: '' };

// PB-13: Administrator maintains maintenance categories.
export default function Categories() {
  const { categories = [], managers = [], routingConfigured, saveCategory } = useStore();
  const toast = useToast();
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const managerName = (id) => managers.find((m) => m.id === id)?.name || (id ? 'Inactive manager' : '');

  const open = (category) => { setError(''); setEditing({ ...BLANK, ...category }); };
  const set = (key) => (e) => setEditing((c) => ({ ...c, [key]: key === 'active' ? e.target.value === 'Active' : e.target.value }));

  const save = async () => {
    if (!editing.name.trim()) { setError('Enter a category name.'); return; }
    setBusy(true);
    try {
      await saveCategory({ id: editing.id || undefined, name: editing.name, description: editing.description || '', active: editing.active, managerId: editing.managerId || '' });
      toast(editing.id ? `${editing.name} saved` : `${editing.name} added`);
      setEditing(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (!configured) {
    return <div className="page-inner"><PageHeader title="Categories" /><div className="card"><EmptyState icon="folder" title="Connect Firebase" text="Categories are saved in the database. Configure Firebase to manage them." /></div></div>;
  }

  return (
    <div className="page-inner">
      <PageHeader
        title="Categories"
        subtitle="Maintenance categories used by the AI and routing rules. Map each category to a manager on Routing Rules."
        actions={routingConfigured ? <Button icon="plus" onClick={() => open(BLANK)}>Add Category</Button> : null}
      />

      {routingConfigured === false && <RoutingSetup />}

      {routingConfigured && (
        <Card>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Category</th><th>Description</th><th>Status</th><th>Routes to</th><th /></tr></thead>
              <tbody>
                {categories.map((c) => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{c.name}{isFallback(c.name) && <div className="sub">Fallback</div>}</td>
                    <td className="muted" style={{ maxWidth: 380 }}>{c.description || '—'}</td>
                    <td>{c.active ? <Pill tone="green" size="sm">Active</Pill> : <Pill tone="gray" size="sm">Inactive</Pill>}</td>
                    <td>{managerName(c.managerId) || <span className="muted">{isFallback(c.name) ? 'Admin manual review' : 'Not mapped'}</span>}</td>
                    <td><Button size="sm" variant="secondary" onClick={() => open(c)}>Edit</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="field-hint" style={{ marginTop: 12 }}>Inactive categories stop being offered to the AI and managers; their requests go to General Maintenance. A category already used by requests can't be renamed — deactivate it and add a new one.</p>
        </Card>
      )}

      {editing && (
        <Modal
          title={editing.id ? `Edit ${editing.name || 'category'}` : 'Add category'}
          onClose={() => setEditing(null)}
          actions={<><Button variant="secondary" onClick={() => setEditing(null)} disabled={busy}>Cancel</Button><Button onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save'}</Button></>}
        >
          <div className="stack gap-12">
            <Field label="Name" required htmlFor="cat-name"><Input id="cat-name" maxLength={60} value={editing.name} onChange={set('name')} disabled={editing.id && isFallback(editing.name)} /></Field>
            <Field label="Description" htmlFor="cat-desc" hint="Shown to admins; helps when mapping categories."><Textarea id="cat-desc" rows={2} maxLength={500} value={editing.description} onChange={set('description')} /></Field>
            <Field label="Status" htmlFor="cat-status" hint={isFallback(editing.name) ? 'The fallback category must stay active.' : undefined}>
              <Select id="cat-status" options={['Active', 'Inactive']} value={editing.active ? 'Active' : 'Inactive'} onChange={set('active')} disabled={isFallback(editing.name)} />
            </Field>
            {!editing.id && (
              <Field label="Routes to" htmlFor="cat-mgr" hint="Optional. You can map it later on Routing Rules.">
                <Select id="cat-mgr" placeholder="Not mapped" options={managers.map((m) => ({ value: m.id, label: m.name }))} value={editing.managerId} onChange={set('managerId')} />
              </Field>
            )}
            {error && <div className="form-alert" role="alert">{error}</div>}
          </div>
        </Modal>
      )}
    </div>
  );
}
