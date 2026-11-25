import { useState } from 'react';
import Icon from '../../components/Icon.jsx';
import { Button, Card, EmptyState, Field, Input, Modal, PageHeader, Pill, Select, Textarea } from '../../components/ui.jsx';
import { useStore } from '../../context/StoreContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { configured } from '../../firebase.js';
import { hasTrade } from '../../data/trades.js';

const BLANK = { name: '', description: '', active: true };

// Administrator maintains technician trades. The AI recommends from the active
// trades, and technicians and work orders must use one of them.
export default function Trades() {
  const { trades = [], tradesSaved, technicians = [], importTrades, saveTrade } = useStore();
  const toast = useToast();
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const technicianCount = (name) => technicians.filter((t) => hasTrade(t, name)).length;
  const open = (trade) => { setError(''); setEditing({ ...BLANK, ...trade }); };
  const set = (key) => (e) => setEditing((t) => ({ ...t, [key]: key === 'active' ? e.target.value === 'Active' : e.target.value }));

  const importToDatabase = async () => {
    setBusy(true);
    try {
      const { count } = await importTrades();
      toast(`${count} trades saved to the database`);
    } catch (e) { toast(e.message, 'error'); } finally { setBusy(false); }
  };

  const save = async () => {
    if (!editing.name.trim()) { setError('Enter a trade name.'); return; }
    setBusy(true);
    try {
      await saveTrade({ id: editing.id || undefined, name: editing.name, description: editing.description || '', active: editing.active });
      toast(editing.id ? `${editing.name} saved` : `${editing.name} added`);
      setEditing(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (!configured) {
    return <div className="page-inner"><PageHeader title="Trades" /><div className="card"><EmptyState icon="wrench" title="Connect Firebase" text="Trades are saved in the database. Configure Firebase to manage them." /></div></div>;
  }

  return (
    <div className="page-inner">
      <PageHeader
        title="Trades"
        subtitle="Technician trades and skills. The AI recommends a trade from this list, and technicians are matched to work orders by trade."
        actions={tradesSaved ? <Button icon="plus" onClick={() => open(BLANK)}>Add Trade</Button> : null}
      />

      {!tradesSaved && (
        <div className="info-card" role="status" style={{ alignItems: 'center' }}>
          <Icon name="info" size={24} />
          <div style={{ flex: 1, fontSize: 14 }}>
            <strong>These are the built-in trades.</strong> Save them to the database to add your own, edit or deactivate them.
          </div>
          <Button icon="save" onClick={importToDatabase} disabled={busy}>{busy ? 'Saving…' : 'Save to database'}</Button>
        </div>
      )}

      <Card>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Trade</th><th>Description</th><th>Status</th><th>Technicians</th><th /></tr></thead>
            <tbody>
              {trades.map((t) => (
                <tr key={t.id}>
                  <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{t.name}</td>
                  <td className="muted" style={{ maxWidth: 420 }}>{t.description || '—'}</td>
                  <td>{t.active ? <Pill tone="green" size="sm">Active</Pill> : <Pill tone="gray" size="sm">Inactive</Pill>}</td>
                  <td>{technicianCount(t.name)}</td>
                  <td>{tradesSaved && <Button size="sm" variant="secondary" onClick={() => open(t)}>Edit</Button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="field-hint" style={{ marginTop: 12 }}>
          "HVAC" and "HVAC Technician" count as the same trade. Inactive trades stop being offered to the AI and for new technicians or work orders; existing ones keep theirs. A trade already used by technicians or work orders can't be renamed. Deactivate it and add a new one instead.
        </p>
      </Card>

      {editing && (
        <Modal
          title={editing.id ? `Edit ${editing.name || 'trade'}` : 'Add trade'}
          onClose={() => setEditing(null)}
          actions={<><Button variant="secondary" onClick={() => setEditing(null)} disabled={busy}>Cancel</Button><Button onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save'}</Button></>}
        >
          <div className="stack gap-12">
            <Field label="Name" required htmlFor="trade-name" hint='e.g. "Carpenter", "Painter", "Locksmith"'><Input id="trade-name" maxLength={60} value={editing.name} onChange={set('name')} /></Field>
            <Field label="Description" htmlFor="trade-desc" hint="Helps the AI pick the right trade."><Textarea id="trade-desc" rows={2} maxLength={300} value={editing.description} onChange={set('description')} /></Field>
            <Field label="Status" htmlFor="trade-status"><Select id="trade-status" options={['Active', 'Inactive']} value={editing.active ? 'Active' : 'Inactive'} onChange={set('active')} /></Field>
            {error && <div className="form-alert" role="alert">{error}</div>}
          </div>
        </Modal>
      )}
    </div>
  );
}
