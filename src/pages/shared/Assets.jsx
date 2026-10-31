import { useEffect, useMemo, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import Icon from '../../components/Icon.jsx';
import {
  Button, EmptyState, Input, KebabButton, Pagination, Pill, Select, StatCard, StatusPill, Tabs,
} from '../../components/ui.jsx';
import { useStore } from '../../context/StoreContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { fmtDate } from '../../data/format.js';

const PAGE_SIZE = 10;

export default function Assets() {
  const { assets } = useStore();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState(assets[0]?.id);
  const [checked, setChecked] = useState([]);

  const categories = [...new Set(assets.map((a) => a.category))];
  const filtered = useMemo(() => assets.filter((a) =>
    (!category || a.category === category) &&
    (!status || a.status === status) &&
    `${a.tag} ${a.name} ${a.location}`.toLowerCase().includes(q.toLowerCase())), [assets, q, category, status]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  useEffect(() => { if (page > pageCount) setPage(1); }, [page, pageCount]);
  const rows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const selected = assets.find((a) => a.id === selectedId);

  return (
    <div className="page-inner">
      <div className="assets-layout">
        <section className="stack gap-20">
          <div>
            <h1 className="page-title">Assets</h1>
            <p className="page-subtitle">View and manage all equipment and assets.</p>
          </div>
          <div className="stats" style={{ gridTemplateColumns: '1fr 1fr 1.15fr', gap: 14 }}>
            <StatCard tone="blue" icon="box" value={assets.length} label="Total Assets" />
            <StatCard tone="green" icon="check" value={assets.filter((a) => a.status === 'Operational').length} label="Operational" />
            <StatCard tone="amber" icon="warnSolid" value={assets.filter((a) => a.status !== 'Operational').length} label="Needs Maintenance" />
          </div>

          <div className="filters">
            <Input className="grow" icon="search" placeholder="Search assets..." value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
            <Select style={{ width: 150 }} options={[{ value: '', label: 'All Categories' }, ...categories]} value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }} aria-label="Category" />
            <Select style={{ width: 150 }} options={[{ value: '', label: 'All Statuses' }, 'Operational', 'Needs Maintenance', 'Out of Service']} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} aria-label="Status" />
          </div>

          {rows.length === 0 ? (
            <div className="card"><EmptyState icon="box" title="No assets found" text="Try a different search or filter." /></div>
          ) : (
            <div className="table-wrap">
              <table className="table" style={{ fontSize: 13 }}>
                <thead>
                  <tr>
                    <th style={{ width: 36 }} />
                    <th style={{ width: 52, paddingLeft: 0 }} />
                    <th style={{ paddingLeft: 0 }}>Asset Tag</th><th>Name</th><th>Type</th><th>Location</th><th>Status</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((a) => (
                    <tr key={a.id} className={`clickable ${a.id === selectedId ? 'is-selected' : ''}`} onClick={() => setSelectedId(a.id)}>
                      <td style={{ paddingRight: 0 }} onClick={(e) => e.stopPropagation()}>
                        <label className="checkbox"><input type="checkbox" checked={checked.includes(a.id)} onChange={() => setChecked((c) => (c.includes(a.id) ? c.filter((x) => x !== a.id) : [...c, a.id]))} aria-label={`Select ${a.tag}`} /><span className="checkbox-box"><Icon name="check" size={14} strokeWidth={3.5} /></span></label>
                      </td>
                      <td style={{ paddingLeft: 0, paddingRight: 0 }}><img className="thumb" src={a.image} alt="" /></td>
                      <td style={{ whiteSpace: 'nowrap' }}>{a.tag}</td>
                      <td>{a.name}</td>
                      <td>{a.type}</td>
                      <td style={{ whiteSpace: 'nowrap', lineHeight: '20px' }}>{a.building}<br />{a.room}</td>
                      <td><StatusPill status={a.status} size="sm" /></td>
                      <td><KebabButton active={a.id === selectedId} onClick={(e) => e.stopPropagation()} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="pager">
            <div className="pager-text">Showing {filtered.length ? (page - 1) * PAGE_SIZE + 1 : 0} to {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} assets</div>
            <Pagination page={page} pageCount={pageCount} onChange={setPage} />
          </div>
        </section>

        <section className="stack gap-16">
          <div className="row" style={{ justifyContent: 'flex-end', minHeight: 40 }}>
            <Button icon="plus" onClick={() => toast('Asset creation form is not designed yet.', 'error')}>Add Asset</Button>
          </div>
          {selected ? <AssetDetail key={selected.id} asset={selected} /> : <div className="card"><EmptyState title="Select an asset" /></div>}
        </section>
      </div>
    </div>
  );
}

function AssetDetail({ asset: a }) {
  const toast = useToast();
  const [tab, setTab] = useState('overview');

  return (
    <div className="card" style={{ padding: '18px 16px 16px' }}>
      <div className="asset-head">
        <img className="photo asset-photo" src={a.image} alt={a.name} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="row between">
            <div className="row gap-12"><span style={{ fontSize: 23, fontWeight: 700, letterSpacing: '-0.4px' }}>{a.tag}</span><StatusPill status={a.status} /></div>
            <div className="row gap-12"><Button variant="ghost" size="sm" onClick={() => toast('Asset editing is not designed yet.', 'error')}>Edit</Button><KebabButton /></div>
          </div>
          <div className="muted" style={{ fontSize: 14.5, marginTop: 4 }}>{a.name}</div>
          <div className="asset-meta">
            <span className="inline-icon"><Icon name="calendar" size={18} />{a.category}</span>
            <span className="inline-icon"><Icon name="gear" size={18} />{a.brand} {a.model}</span>
            <span className="inline-icon"><Icon name="barcode" size={18} />S/N: {a.serial}</span>
          </div>
          <div className="row gap-12" style={{ marginTop: 14, alignItems: 'flex-start' }}>
            <Icon name="mapPin" size={18} strokeWidth={2} />
            <div><div style={{ fontSize: 14.5 }}>{a.location}</div><div className="muted" style={{ fontSize: 13.5, marginTop: 4 }}>{a.locationDetail}</div></div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 18 }}>
        <Tabs variant="underline" tabs={[
          { key: 'overview', label: 'Overview' }, { key: 'history', label: 'Maintenance History' }, { key: 'wo', label: 'Work Orders' }, { key: 'parts', label: 'Parts' }, { key: 'docs', label: 'Documents' },
        ]} active={tab} onChange={setTab} />
      </div>

      {tab === 'overview' && (
        <>
          <div className="asset-grid" style={{ marginTop: 16 }}>
            <div className="box">
              <div className="box-title"><Icon name="clipboard" size={20} />Asset Details</div>
              <dl className="kv" style={{ gridTemplateColumns: '130px 1fr', fontSize: 14, gap: '8px 8px', marginTop: 14 }}>
                <dt>Asset Tag</dt><dd>{a.tag}</dd>
                <dt>Type</dt><dd>{a.name}</dd>
                <dt>Category</dt><dd>{a.category}</dd>
                <dt>Brand</dt><dd>{a.brand}</dd>
                <dt>Model</dt><dd>{a.model}</dd>
                <dt>Serial Number</dt><dd>{a.serial}</dd>
                <dt>Install Date</dt><dd>{fmtDate(a.installDate)}</dd>
                <dt>Warranty Expiry</dt><dd>{fmtDate(a.warrantyExpiry)}</dd>
                <dt>Location</dt><dd>{a.location}</dd>
                <dt>Status</dt><dd><StatusPill status={a.status} size="sm" /></dd>
              </dl>
            </div>
            <div className="box stack gap-12">
              <div className="box-title"><Icon name="shieldLoc" size={20} />Location</div>
              {a.locationImage ? <img className="photo loc-img" src={a.locationImage} alt={a.location} /> : <div className="photo loc-img" />}
              <div><div style={{ fontSize: 14.5 }}>{a.location}</div><div className="muted" style={{ fontSize: 13.5, marginTop: 4 }}>{a.locationDetail}</div></div>
              <Button variant="ghost" icon="mapPin" onClick={() => toast('Map view is not connected in this demo.', 'error')}>View on Map</Button>
              <div className="divider" />
              <div className="box-title" style={{ fontSize: 13.5 }}><Icon name="shieldLoc" size={18} />QR Code</div>
              <div className="qr-row">
                <QRCodeSVG value={a.tag} size={72} level="M" />
                <Button variant="ghost" icon="printer" onClick={() => window.print()}>Print Label</Button>
              </div>
            </div>
          </div>

          <div className="asset-grid" style={{ marginTop: 14, gridTemplateColumns: '306px minmax(0,1fr)' }}>
            <div className="box">
              <div className="row between"><div className="box-title"><Icon name="calendar" size={20} />Upcoming Maintenance</div><span className="link" style={{ fontSize: 13.5 }}>View All</span></div>
              {a.upcoming.length === 0 ? <p className="muted" style={{ fontSize: 13.5, marginTop: 14 }}>Nothing scheduled.</p> : a.upcoming.map((u) => (
                <div key={u.title} className="row gap-12" style={{ alignItems: 'flex-start', marginTop: 16 }}>
                  <Icon name="infoCircle" size={16} style={{ color: 'var(--blue)', marginTop: 2 }} />
                  <div className="stack gap-8" style={{ fontSize: 13.5 }}>
                    <div className="row gap-8"><span style={{ fontWeight: 600 }}>{u.title}</span><Pill tone="purple" size="sm">{u.type}</Pill><Pill tone="blue" size="sm">{u.status}</Pill></div>
                    <div className="muted" style={{ marginTop: -4 }}>{fmtDate(u.date)}</div>
                    <div style={{ color: 'var(--text-3)' }}>{u.note}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="box">
              <div className="row between"><div className="box-title"><Icon name="fileText" size={20} />Recent Work Orders</div><span className="link" style={{ fontSize: 13.5 }}>View All</span></div>
              <div style={{ marginTop: 14 }}>
                {a.history.length === 0 ? <p className="muted" style={{ fontSize: 13.5 }}>No work orders yet.</p> : a.history.map((h) => (
                  <div key={h.id} className="rwo">
                    <div><div><span className="rwo-id">{h.id}</span><span className="rwo-date">{fmtDate(h.date)}</span></div><div className="rwo-desc">{h.desc}</div></div>
                    <StatusPill status={h.status} size="sm" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {tab === 'history' && (
        <div className="stack gap-8" style={{ marginTop: 16 }}>
          {a.history.filter((h) => h.status === 'Completed').length === 0
            ? <EmptyState icon="history" title="No maintenance history" />
            : a.history.filter((h) => h.status === 'Completed').map((h) => <div key={h.id} className="note-item"><div className="tl-meta">{fmtDate(h.date)} · {h.id}</div>{h.desc}</div>)}
        </div>
      )}
      {tab === 'wo' && (
        <div style={{ marginTop: 16 }}>
          {a.history.length === 0 ? <EmptyState icon="fileText" title="No work orders" /> : a.history.map((h) => (
            <div key={h.id} className="rwo" style={{ padding: '10px 0', borderTop: '1px solid var(--line)' }}>
              <div><div><span className="rwo-id">{h.id}</span><span className="rwo-date">{fmtDate(h.date)}</span></div><div className="rwo-desc">{h.desc}</div></div>
              <StatusPill status={h.status} size="sm" />
            </div>
          ))}
        </div>
      )}
      {tab === 'parts' && <EmptyState icon="inventory" title="No parts linked" text="Parts / Inventory is planned for a later sprint." />}
      {tab === 'docs' && <EmptyState icon="fileText" title="No documents" text="Manuals and warranty documents will appear here." />}
    </div>
  );
}
