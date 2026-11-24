import { useEffect, useState } from 'react';
import Icon from './Icon.jsx';
import { Button, Card, Select } from './ui.jsx';
import { useStore } from '../context/StoreContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { isFallback, suggestDefaults } from '../data/routing.js';

// One-time setup: save the agreed default categories and their managers (PB-13).
export default function RoutingSetup() {
  const { managers = [], importRouting } = useStore();
  const toast = useToast();
  const [rows, setRows] = useState(() => suggestDefaults(managers));
  const [busy, setBusy] = useState(false);

  // Managers load after the first render; refill suggestions until the admin edits.
  const [touched, setTouched] = useState(false);
  useEffect(() => { if (!touched) setRows(suggestDefaults(managers)); }, [managers.map((m) => m.id).join()]);

  const setManager = (index) => (e) => {
    setTouched(true);
    setRows((list) => list.map((row, i) => (i === index ? { ...row, managerId: e.target.value } : row)));
  };

  const save = async () => {
    setBusy(true);
    try {
      const result = await importRouting(rows.map(({ defaultManager, ...row }) => row));
      toast(`Routing set up: ${result.count} categories saved and existing requests routed`);
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const options = managers.map((m) => ({ value: m.id, label: `${m.name}${m.category ? ` (${m.category})` : ''}` }));

  return (
    <Card title="Set up categories and routing" icon="route">
      <p className="muted" style={{ fontSize: 14, marginBottom: 12 }}>
        Routing isn't saved yet, so requests currently go to managers by the category on their account. Confirm the agreed defaults below to start routing by these rules. Existing requests and work orders are assigned to the matching manager.
      </p>
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Category</th><th>Routes to</th></tr></thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.name}>
                <td>
                  <div style={{ fontWeight: 600 }}>{row.name}</div>
                  <div className="sub">{isFallback(row.name) ? 'Fallback for unknown, inactive or unmapped categories' : `Agreed default: ${row.defaultManager}`}</div>
                </td>
                <td>
                  <Select className="input-sm" style={{ width: 280 }} aria-label={`Manager for ${row.name}`} placeholder={isFallback(row.name) ? 'No manager (admin manual review)' : 'Choose a manager'} options={options} value={row.managerId} onChange={setManager(index)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {managers.length === 0 && (
        <div className="info-card" style={{ marginTop: 12 }}><Icon name="info" size={22} /><div style={{ fontSize: 14 }}>No active Category Managers yet. Add them on Users &amp; Roles first, or save now and map managers later.</div></div>
      )}
      <div className="row" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
        <Button icon="save" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save categories and routing'}</Button>
      </div>
    </Card>
  );
}
