import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../components/Icon.jsx';
import {
  Button, EmptyState, Field, IconButton, Input, KebabButton, Modal, Pill, PriorityPill, Select, StatusPill, Tabs, Textarea,
} from '../../components/ui.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useStore } from '../../context/StoreContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { CATEGORIES, PRIORITY_NAMES, TRADES } from '../../data/mock.js';
import { fmtDate, fmtDateTime, fmtTime } from '../../data/format.js';

const getDate = (value) => value?.toDate?.() || (value?.seconds ? new Date(value.seconds * 1000) : value ? new Date(value) : null);
const displayDate = (value) => { const d = getDate(value); return d && !Number.isNaN(d.getTime()) ? d.toLocaleString() : 'Not available'; };
const isApproved = (r) => ['approved', 'scheduled', 'in progress', 'in_progress', 'completed'].includes(String(r.status || '').toLowerCase());
const isRejected = (r) => ['rejected', 'cancelled'].includes(String(r.status || '').toLowerCase());
const isPending = (r) => r.analysisStatus === 'completed' && !isApproved(r) && !isRejected(r);
const locationOf = (r) => r.location || [r.buildingName || r.buildingId, r.roomName || r.roomId].filter(Boolean).join(' / ') || 'Not available';

const PRIORITY_RANK = { Critical: 0, High: 1, Medium: 2, Low: 3 };

export default function ManagerQueue() {
  const { user } = useAuth();
  const { requests, updateRequest, rejectRequest } = useStore();
  const toast = useToast();
  const navigate = useNavigate();

  const [tab, setTab] = useState('pending');
  const [q, setQ] = useState('');
  const [priority, setPriority] = useState('');
  const [sort, setSort] = useState('newest');
  const [selectedId, setSelectedId] = useState(null);
  const [checked, setChecked] = useState([]);

  const managerRequests = useMemo(() => requests.filter((r) =>
    r.routedCategory === user?.category || (!r.routedCategory && r.category === user?.category)
  ), [requests, user?.category]);

  const counts = {
    pending: managerRequests.filter(isPending).length,
    approved: managerRequests.filter(isApproved).length,
    all: managerRequests.length,
  };

  const rows = useMemo(() => {
    let list = managerRequests.filter((r) => (tab === 'pending' ? isPending(r) : tab === 'approved' ? isApproved(r) : true));
    if (priority) list = list.filter((r) => (r.priority || r.ai?.priority) === priority);
    if (q) list = list.filter((r) => `${r.id} ${r.description} ${locationOf(r)}`.toLowerCase().includes(q.toLowerCase()));
    return [...list].sort((a, b) => {
      if (sort === 'priority') return (PRIORITY_RANK[a.priority || a.ai?.priority] ?? 99) - (PRIORITY_RANK[b.priority || b.ai?.priority] ?? 99);
      const d = (getDate(b.submittedAt || b.createdAt)?.getTime() || 0) - (getDate(a.submittedAt || a.createdAt)?.getTime() || 0);
      return sort === 'oldest' ? -d : d;
    });
  }, [managerRequests, tab, priority, q, sort]);

  // Keep a sensible selection as filters change
  useEffect(() => {
    if (!rows.find((r) => r.id === selectedId)) setSelectedId(rows[0]?.id ?? null);
  }, [rows, selectedId]);

  const selected = managerRequests.find((r) => r.id === selectedId);
  const toggleCheck = (id) => setChecked((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));
  const allChecked = rows.length > 0 && rows.every((r) => checked.includes(r.id));

  const exportCsv = () => {
    const header = 'Request,Description,Location,Priority,Safety,Submitted,Status';
    const lines = rows.map((r) => [r.id, `"${r.description.replace(/"/g, '""')}"`, locationOf(r), r.priority || r.ai?.priority, r.safety || r.ai?.safetyFlag ? 'Yes' : 'No', displayDate(r.submittedAt || r.createdAt), r.status].join(','));
    const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'queue.csv';
    a.click();
    toast(`Exported ${rows.length} requests`);
  };

  return (
    <div className="queue-layout">
      <section className="queue-main">
        <div>
          <h1 className="page-title">My Queue</h1>
          <p className="page-subtitle">Requests routed to {user.category}. Review AI recommendations and take action.</p>
        </div>

        <div className="row between" style={{ borderBottom: '1px solid #E2E7EE' }}>
          <Tabs
            variant="underline"
            tabs={[
              { key: 'pending', label: `Pending Review (${counts.pending})` },
              { key: 'approved', label: `Approved (${counts.approved})` },
              { key: 'all', label: `All (${counts.all})` },
            ]}
            active={tab}
            onChange={setTab}
          />
          <Button variant="secondary" icon="download" onClick={exportCsv} style={{ marginBottom: 8, fontWeight: 600 }}>Export</Button>
        </div>

        <div className="filters">
          <Input className="grow" icon="search" placeholder="Search requests..." value={q} onChange={(e) => setQ(e.target.value)} />
          <Select options={[{ value: '', label: 'All Priorities' }, ...PRIORITY_NAMES]} value={priority} onChange={(e) => setPriority(e.target.value)} style={{ width: 182 }} aria-label="Filter by priority" />
          <Select options={[{ value: 'newest', label: 'Newest First' }, { value: 'oldest', label: 'Oldest First' }, { value: 'priority', label: 'Highest Priority' }]} value={sort} onChange={(e) => setSort(e.target.value)} style={{ width: 212 }} aria-label="Sort" />
        </div>

        {rows.length === 0 ? (
          <div className="card"><EmptyState icon="queueLine" title="Nothing here" text="No requests match these filters." /></div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 44 }}>
                    <label className="checkbox"><input type="checkbox" checked={allChecked} onChange={() => setChecked(allChecked ? [] : rows.map((r) => r.id))} aria-label="Select all" /><span className="checkbox-box"><Icon name="check" size={14} strokeWidth={3.5} /></span></label>
                  </th>
                  <th>Request #</th><th>Description</th><th>Priority</th><th>Safety</th><th>Submitted</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className={`clickable ${r.id === selectedId ? 'is-selected' : ''}`} onClick={() => setSelectedId(r.id)} style={{ height: 70 }}>
                    <td onClick={(e) => e.stopPropagation()}>
                      <label className="checkbox"><input type="checkbox" checked={checked.includes(r.id)} onChange={() => toggleCheck(r.id)} aria-label={`Select ${r.id}`} /><span className="checkbox-box"><Icon name="check" size={14} strokeWidth={3.5} /></span></label>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>{r.id}</td>
                    <td style={{ maxWidth: 190 }}>{r.description}</td>
                    <td><PriorityPill priority={r.priority || r.ai?.priority || 'Medium'} /></td>
                    <td>{(r.safety || r.ai?.safetyFlag) ? <Pill tone="red">Yes</Pill> : <Pill tone="gray">No</Pill>}</td>
                    <td style={{ whiteSpace: 'nowrap' }}><div>{displayDate(r.submittedAt || r.createdAt)}</div></td>
                    <td>
                      <div className="cell-actions">
                        <Button variant={r.id === selectedId ? 'primary' : 'ghost'} size="sm" onClick={(e) => { e.stopPropagation(); navigate(`/manager/review/${r.id}`); }}>Review</Button>
                        <KebabButton onClick={(e) => e.stopPropagation()} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="pager">
          <div className="pager-text">Showing {rows.length ? 1 : 0} to {rows.length} of {rows.length} requests</div>
        </div>
      </section>

      <aside className="panel" aria-label="Request details">
        {selected ? (
          <RequestPanel
            key={selected.id}
            request={selected}
            onClose={() => setSelectedId(null)}
            onSave={(changes) => { updateRequest(selected.id, changes); toast('Changes saved'); }}
            onReject={(note) => { rejectRequest(selected.id, note); toast(`${selected.id} rejected`); }}
            onApprove={(changes) => { updateRequest(selected.id, changes); navigate(`/manager/review/${selected.id}`); }}
          />
        ) : (
          <div className="panel-empty"><EmptyState icon="clipboard" title="Select a request" text="Choose a request from the queue to see its details." /></div>
        )}
      </aside>
    </div>
  );
}

function RequestPanel({ request: r, onClose, onSave, onReject, onApprove }) {
  const [tab, setTab] = useState('overview');
  const [form, setForm] = useState({
    category: r.ai?.category || r.routedCategory || '', priority: r.priority || r.ai?.priority || 'Medium', trade: r.ai?.trade || '', safety: (r.safety || r.ai?.safetyFlag) ? 'Yes' : 'No', notes: '',
  });
  const [rejecting, setRejecting] = useState(false);
  const [rejectNote, setRejectNote] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const changes = { priority: form.priority, safety: form.safety === 'Yes', ai: { ...(r.ai || {}), category: form.category, trade: form.trade } };

  return (
    <>
      <div className="panel-head">
        <div>
          <div className="row gap-12">
            <span className="panel-id">{r.id}</span>
            <StatusPill status={r.status} size="sm" />
          </div>
          <div className="panel-meta">Submitted {displayDate(r.submittedAt || r.createdAt)} &nbsp;•&nbsp; {r.requesterName} (Requester)</div>
        </div>
        <IconButton icon="x" label="Close panel" onClick={onClose} style={{ border: 'none' }} />
      </div>

      <Tabs variant="soft" tabs={[{ key: 'overview', label: 'Overview' }, { key: 'ai', label: 'AI Recommendation' }, { key: 'history', label: 'History' }]} active={tab} onChange={setTab} />

      {tab === 'overview' && (
        <>
          <div className="box box-gray">
            <div className="row between"><span className="box-title">Original Request</span></div>
            <div className="row gap-16" style={{ marginTop: 12, alignItems: 'flex-start' }}>
              <div className="stack gap-8" style={{ flex: 1, fontSize: 13.5 }}>
                <div><div style={{ fontWeight: 600 }}>Description</div><div className="muted" style={{ lineHeight: '20px', marginTop: 2 }}>{r.description}</div></div>
                <div><div style={{ fontWeight: 600 }}>Location</div><div className="inline-icon" style={{ marginTop: 4 }}><Icon name="mapPin" size={16} />{locationOf(r)}</div></div>
                <div>
                  <div style={{ fontWeight: 600 }}>Contact</div>
                  <div className="inline-icon" style={{ display: 'flex', marginTop: 4 }}><Icon name="phone" size={16} />{r.phone}</div>
                  <div className="inline-icon" style={{ display: 'flex', marginTop: 4 }}><Icon name="mail" size={16} />{r.email}</div>
                </div>
              </div>
              {r.photos?.[0] && <img className="photo" src={r.photos[0]} alt="Request photo" style={{ width: 86, height: 86 }} />}
            </div>
          </div>
          <AiBox ai={r.ai} />
        </>
      )}
      {tab === 'ai' && <AiBox ai={r.ai} detailed />}
      {tab === 'history' && (
        <div className="box">
          <div className="timeline">
            {[
              { title: 'Request Submitted', meta: displayDate(r.submittedAt || r.createdAt), done: true },
              { title: 'AI Analysis Completed', meta: r.ai?.analyzedAt ? displayDate(r.ai?.analyzedAt) : 'In progress', done: !!r.ai?.analyzedAt },
              { title: r.status === 'Pending Review' ? 'Pending Manager Review' : r.status, meta: 'Current status', done: false },
            ].map((t, i, arr) => (
              <div key={t.title} className="tl-item">
                <div className="tl-rail">
                  <div className={`tl-dot ${t.done ? 'done' : 'on'}`}>{t.done && <Icon name="check" size={14} strokeWidth={3} style={{ color: '#fff' }} />}</div>
                  {i < arr.length - 1 && <div className="tl-line" />}
                </div>
                <div className="tl-body"><div className="tl-title" style={{ fontSize: 14 }}>{t.title}</div><div className="tl-meta">{t.meta}</div></div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="box">
        <div className="box-title" style={{ fontSize: 14 }}><Icon name="edit" size={18} strokeWidth={2} />Manager Action</div>
        <div className="form-grid-2" style={{ marginTop: 12, gap: '10px 14px' }}>
          <Field label="Category"><Select options={CATEGORIES} value={form.category} onChange={set('category')} /></Field>
          <Field label="Priority"><Select options={PRIORITY_NAMES} value={form.priority} onChange={set('priority')} /></Field>
          <Field label="Trade"><Select options={TRADES} value={form.trade} onChange={set('trade')} /></Field>
          <Field label="Safety Flag"><Select options={['No', 'Yes']} value={form.safety} onChange={set('safety')} /></Field>
        </div>
        <Field label="Notes (Optional)" className="" htmlFor="mgr-notes">
          <Textarea id="mgr-notes" placeholder="Add a note about your review or changes..." value={form.notes} onChange={set('notes')} style={{ marginTop: 0 }} />
        </Field>
      </div>

      <div className="panel-actions">
        <Button variant="danger" onClick={() => setRejecting(true)}>Reject</Button>
        <Button variant="secondary" onClick={() => onSave(changes)}>Save Changes</Button>
        <Button onClick={() => onApprove(changes)}>Approve &amp; Create Work Order</Button>
      </div>

      {rejecting && (
        <Modal
          title={`Reject ${r.id}?`}
          onClose={() => setRejecting(false)}
          actions={<><Button variant="secondary" onClick={() => setRejecting(false)}>Cancel</Button><Button variant="danger" onClick={() => { onReject(rejectNote); setRejecting(false); }}>Reject Request</Button></>}
        >
          <p>The requester will be notified. Add a reason so they know what to do next.</p>
          <Textarea placeholder="Reason for rejection (optional)" value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} />
        </Modal>
      )}
    </>
  );
}

function AiBox({ ai, detailed }) {
  ai = ai || {};
  return (
    <div className="box box-purple">
      <div className="row between">
        <div className="box-title"><Icon name="sparkles" size={20} className="ai-icon" /><span className="ai-title">AI Recommendation</span></div>
        {detailed && <span className="conf">Confidence: {typeof ai.confidence === 'number' ? (ai.confidence <= 1 ? Math.round(ai.confidence * 100) : Math.round(ai.confidence)) : 'N/A'}%</span>}
      </div>
      <dl className="kv-sm">
        <dt>Category</dt><dd>{ai.category}</dd>
        <dt>Priority</dt><dd><PriorityPill priority={ai.priority} size="sm" /></dd>
        <dt>Trade</dt><dd>{ai.trade}</dd>
        <dt style={{ alignSelf: 'start', paddingTop: 8 }}>Suggested Action</dt><dd><div className="note-box">{ai.suggestedAction}</div></dd>
        <dt>Safety Flag</dt><dd>{ai.safetyFlag ? <Pill tone="red" size="sm">Yes</Pill> : <Pill tone="gray" size="sm" className="">No</Pill>}</dd>
      </dl>
      {detailed && (
        <p className="field-hint" style={{ marginTop: 12 }}>
          {ai.analyzedAt ? `Analyzed ${displayDate(ai.analyzedAt)}.` : 'Analysis in progress.'} Recommendations are suggestions; your changes in Manager Action take priority.
        </p>
      )}
    </div>
  );
}
