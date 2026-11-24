import { useState } from 'react';
import Icon from '../../components/Icon.jsx';
import { Button, Card, EmptyState, Input, PageHeader, Pill, Select } from '../../components/ui.jsx';
import RoutingSetup from '../../components/RoutingSetup.jsx';
import { useStore } from '../../context/StoreContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { configured } from '../../firebase.js';
import { FALLBACK_CATEGORY, isFallback, resolveRoute } from '../../data/routing.js';

const REASON = {
  matched: 'Matched an active, mapped category.',
  unknown: 'Not a known category, so it falls back.',
  missing: 'No category given, so it falls back.',
  inactive: 'That category is inactive, so it falls back.',
  unmapped: 'That category has no manager, so it falls back.',
};

// PB-13: map each active category to an eligible Category Manager.
export default function RoutingRules() {
  const { categories = [], managers = [], routingConfigured, saveCategory } = useStore();
  const toast = useToast();
  const [saving, setSaving] = useState('');
  const [probe, setProbe] = useState('HVAC');

  const managerName = (id) => managers.find((m) => m.id === id)?.name || '';
  const fallback = categories.find((c) => isFallback(c.name));
  const result = resolveRoute(probe, categories);

  const remap = async (category, managerId) => {
    setSaving(category.id);
    try {
      const { id, name, description = '', active } = category;
      await saveCategory({ id, name, description, active, managerId });
      toast(managerId ? `${name} now routes to ${managerName(managerId)}` : `${name} is no longer mapped`);
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setSaving('');
    }
  };

  if (!configured) {
    return <div className="page-inner"><PageHeader title="Routing Rules" /><div className="card"><EmptyState icon="route" title="Connect Firebase" text="Routing rules are saved in the database. Configure Firebase to manage them." /></div></div>;
  }

  return (
    <div className="page-inner">
      <PageHeader title="Routing Rules" subtitle="Choose which Category Manager receives requests for each category. Changes apply to the next routing decision." />

      {routingConfigured === false && <RoutingSetup />}

      {routingConfigured && (
        <>
          {fallback && !fallback.managerId && (
            <div className="info-card" role="status">
              <Icon name="info" size={22} />
              <div style={{ fontSize: 14 }}><strong>{FALLBACK_CATEGORY} has no manager.</strong> Requests that don't match a mapped category wait for an administrator's manual review. Map a manager below to send them to a queue.</div>
            </div>
          )}

          <Card>
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Category</th><th>Status</th><th>Routes to</th></tr></thead>
                <tbody>
                  {categories.map((c) => (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 600 }}>{c.name}{isFallback(c.name) && <div className="sub">Fallback for unknown, inactive or unmapped categories</div>}</td>
                      <td>{c.active ? <Pill tone="green" size="sm">Active</Pill> : <Pill tone="gray" size="sm">Inactive</Pill>}</td>
                      <td>
                        {c.active ? (
                          <Select
                            className="input-sm"
                            style={{ width: 280 }}
                            aria-label={`Manager for ${c.name}`}
                            placeholder={isFallback(c.name) ? 'No manager (admin manual review)' : 'Not mapped (goes to General Maintenance)'}
                            options={managers.map((m) => ({ value: m.id, label: m.name }))}
                            value={c.managerId || ''}
                            disabled={saving === c.id}
                            onChange={(e) => remap(c, e.target.value)}
                          />
                        ) : <span className="muted">Inactive: requests go to {FALLBACK_CATEGORY}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card title="Test a category" icon="search">
            <div className="row gap-12 wrap" style={{ alignItems: 'center' }}>
              <Input style={{ width: 260 }} aria-label="Category to test" placeholder="Type a category, e.g. Electronics" value={probe} onChange={(e) => setProbe(e.target.value)} />
              <span style={{ fontSize: 14 }}>
                → <strong>{result.category}</strong>
                {' · '}{result.managerId ? managerName(result.managerId) || 'Inactive manager' : 'admin manual review'}
              </span>
            </div>
            <p className="field-hint" style={{ marginTop: 8 }}>{REASON[result.reason]} This uses the same rules as the server.</p>
          </Card>
        </>
      )}
    </div>
  );
}
