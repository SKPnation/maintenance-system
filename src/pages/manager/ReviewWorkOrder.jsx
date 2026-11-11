import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Icon from '../../components/Icon.jsx';
import {
  Avatar, Button, Card, EmptyState, Field, Input, Modal, PageHeader, Select, StatusPill, Textarea,
} from '../../components/ui.jsx';
import { useStore } from '../../context/StoreContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { CATEGORIES, PRIORITY_NAMES, TRADES } from '../../data/mock.js';
import { fmtDateTime } from '../../data/format.js';
import { tradesMatch } from '../../data/trades.js';

function formatTimestamp(value) {
  if (!value) return 'Not available';
  const date = value?.toDate?.() || (value?.seconds ? new Date(value.seconds * 1000) : new Date(value));
  return Number.isNaN(date.getTime()) ? 'Not available' : date.toLocaleString();
}

const CHIP_BY_PRIORITY = { Critical: 'chip-red', High: 'chip-red', Medium: 'chip-amber', Low: 'chip-green' };

export default function ReviewWorkOrder() {
  const { id } = useParams();
  const { requests, technicians, approveRequest, rejectRequest, updateRequest } = useStore();
  const toast = useToast();
  const navigate = useNavigate();
  const r = requests.find((x) => x.id === id);

  const [form, setForm] = useState(() => ({
    category: r?.ai?.category || '',
    priority: r?.priority || 'Medium',
    trade: r?.ai?.trade || '',
    safety: r?.safety ? 'Yes' : 'No',
    title: r ? `Inspect and service: ${r.description.split('.')[0].slice(0, 60)}` : '',
    description: r?.ai?.suggestedAction || '',
    notes: '',
    technicianId: technicians.find((t) => tradesMatch(t.trade, r?.ai?.trade))?.id || '',
  }));
  // Requests and technicians may arrive after this component first renders.
  useEffect(() => {
    if (!r) return;
    setForm((previous) => ({
      ...previous,
      category: r.routedCategory || r.ai?.category || '',
      priority: r.priority || r.ai?.priority || 'Medium',
      trade: r.ai?.trade || '',
      safety: r.safety || r.ai?.safetyFlag ? 'Yes' : 'No',
      title: `Inspect and service: ${(r.description || '').split('.')[0].slice(0, 60)}`,
      description: r.ai?.suggestedAction || r.description || '',
      technicianId: technicians.find((t) => tradesMatch(t.trade, r.ai?.trade))?.id || '',
    }));
  }, [r?.id, r?.analysisStatus, technicians.length]);

  const [errors, setErrors] = useState({});
  const [rejecting, setRejecting] = useState(false);
  const [showFull, setShowFull] = useState(false);
  const [rejectNote, setRejectNote] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  if (!r) {
    return <div className="page-inner"><div className="card"><EmptyState title="Request not found" text={`We couldn't find ${id}.`} action={<Button to="/manager/queue">Back to My Queue</Button>} /></div></div>;
  }

  const locked = !['submitted', 'pending review', 'pending_review'].includes(String(r.status || '').toLowerCase()) || r.analysisStatus !== 'completed';
  const tech = technicians.find((t) => t.id === form.technicianId);

  const validate = () => {
    const e = {};
    if (!form.title.trim()) e.title = 'Enter a work order title.';
    if (!form.description.trim()) e.description = 'Enter a work order description.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const approve = async () => {
    if (!validate()) return;
    try { const woId = await approveRequest(r.id, {
      title: form.title.trim(),
      description: form.description.trim(),
      category: form.category,
      trade: form.trade,
      priority: form.priority,
      safety: form.safety === 'Yes',
      technicianId: form.technicianId,
      notes: form.notes.trim(),
    });
    toast(form.technicianId ? 'Work order created. Schedule it from the Calendar.' : 'Work order created. Assign a technician from Work Orders.');
    navigate('/manager/work-orders'); }catch(err){toast(err.message,'error');}
  };

  const save = async () => {
    try {
      await updateRequest(r.id, { priority: form.priority, safety: form.safety === 'Yes', ai: { ...(r.ai || {}), category: form.category, trade: form.trade } });
      toast('Changes saved');
    } catch (err) { toast(err.message, 'error'); }
  };

  return (
    <div className="page-inner">
      <PageHeader
        breadcrumbs={[{ label: 'My Queue', to: '/manager/queue' }, { label: r.id }]}
        title="Review & Create Work Order"
        badge={<StatusPill status={r.status} size="lg" />}
        subtitle="Review the AI recommendation, adjust details if needed, assign a technician, and create the work order."
      />

      <div className="review-grid">
        <div className="stack gap-12">
          <Card title="Original Request" icon="fileText" action={<button type="button" className="link" onClick={() => setShowFull(true)}>View Full Details</button>}>
            <div className="detail-grid">
              <dl className="kv" style={{ flex: 1, gridTemplateColumns: '170px 1fr', fontSize: 14.5, gap: 10 }}>
                <dt>Request Number</dt><dd><span className="inline-icon" style={{ fontWeight: 700, color: 'var(--text)' }}>{r.id}<button type="button" className="copy-btn" onClick={() => { navigator.clipboard?.writeText(r.id); toast(`${r.id} copied`); }} aria-label="Copy"><Icon name="copy" size={18} strokeWidth={2} /></button></span></dd>
                <dt>Submitted By</dt><dd>{r.requesterName} (Requester)</dd>
                <dt>Date Submitted</dt><dd>{formatTimestamp(r.submittedAt || r.createdAt)}</dd>
                <dt>Location</dt><dd className="inline-icon"><Icon name="mapPin" size={18} />{r.location || [r.buildingId, r.roomId].filter(Boolean).join(' / ') || 'Not available'}</dd>
                <dt>Description</dt><dd><div className="desc-box">{r.description}</div></dd>
              </dl>
              {r.photos?.[0] && <img className="photo" src={r.photos[0]} alt="Request photo" style={{ width: 190, height: 137 }} />}
            </div>
          </Card>

          <Card title={<>Work Order Details <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(Edit if needed)</span></>} icon="edit">
            <fieldset disabled={locked} style={{ border: 'none' }} className="stack gap-12">
              <div className="form-grid-2">
                <Field label="Category" required><Select options={CATEGORIES} value={form.category} onChange={set('category')} /></Field>
                <Field label="Priority" required><Select options={PRIORITY_NAMES} value={form.priority} onChange={set('priority')} /></Field>
                <Field label="Trade" required><Select options={TRADES} value={form.trade} onChange={set('trade')} /></Field>
                <Field label="Safety Flag" required><Select options={['No', 'Yes']} value={form.safety} onChange={set('safety')} /></Field>
              </div>
              <Field label="Work Order Title" required error={errors.title}><Input value={form.title} onChange={set('title')} invalid={!!errors.title} /></Field>
              <Field label="Work Order Description" required error={errors.description}><Input value={form.description} onChange={set('description')} invalid={!!errors.description} /></Field>
              <Field label="Internal Notes (Optional)"><Textarea rows={2} style={{ minHeight: 44 }} placeholder="Add a note about this work order..." value={form.notes} onChange={set('notes')} /></Field>
            </fieldset>
          </Card>

          <Card title="Assignment" icon="user">
            <fieldset disabled={locked} style={{ border: 'none' }} className="form-grid-2">
              <Field label="Assign Technician" hint="Optional. You can assign or change this later.">
                <div className="input select tech-select">
                  {tech ? <Avatar initials={tech.initials || tech.name?.slice(0, 2) || 'T'} size={32} /> : null}
                  <select value={form.technicianId} onChange={set('technicianId')} aria-label="Technician">
                    <option value="">Assign later</option>
                    {technicians.filter((t) => !form.trade || tradesMatch(t.trade, form.trade)).map((t) => <option key={t.id} value={t.id}>{t.name} ({t.trade})</option>)}
                  </select>
                  <Icon name="chevronDown" size={16} strokeWidth={2.4} className="select-caret" />
                </div>
              </Field>
              <div className="info-card" style={{ alignSelf: 'end' }}><Icon name="calendar" size={22} /><div style={{ fontSize: 14 }}>Service date and time are set from the Calendar after approval, where technician conflicts are checked.</div></div>
            </fieldset>
          </Card>

          {locked ? (
            <div className="info-card"><Icon name="info" size={22} /><div className="info-text" style={{ marginTop: 0 }}>This request is <strong>{r.status}</strong>{r.workOrderId ? ` (work order ${r.workOrderId})` : ''}. It can no longer be edited here.</div></div>
          ) : (
            <div className="review-actions">
              <Button variant="danger" icon="ban" onClick={() => setRejecting(true)}>Reject</Button>
              <Button variant="muted" icon="save" onClick={save}>Save Changes</Button>
              <Button icon="check" onClick={approve}>Approve &amp; Create Work Order</Button>
            </div>
          )}
        </div>

        <div className="stack gap-16">
          <section className="card box-purple" style={{ padding: '16px 18px 18px' }}>
            <div className="row between">
              <div className="card-title"><Icon name="sparkles" size={22} className="ai-icon" /><span className="ai-title" style={{ fontSize: 17 }}>AI Recommendation</span></div>
              <span className="conf">Confidence: {Math.round((r.ai?.confidence || 0) * ((r.ai?.confidence || 0) <= 1 ? 100 : 1))}%</span>
            </div>
            <dl className="kv" style={{ gridTemplateColumns: '152px 1fr', marginTop: 16, fontSize: 14.5, gap: 10, alignItems: 'center' }}>
              <dt style={{ color: 'var(--text-2)' }}>Category</dt><dd><span className="chip chip-blue">{r.ai?.category}</span></dd>
              <dt style={{ color: 'var(--text-2)' }}>Priority</dt><dd><span className={`chip ${CHIP_BY_PRIORITY[r.ai?.priority]}`}>{r.ai?.priority}</span></dd>
              <dt style={{ color: 'var(--text-2)' }}>Trade</dt><dd><span className="chip chip-gray">{r.ai?.trade}</span></dd>
              <dt style={{ color: 'var(--text-2)', alignSelf: 'start' }}>Suggested Action</dt><dd><div className="note-box" style={{ fontSize: 14.5, lineHeight: '21px', color: 'var(--text-3)' }}>{r.ai?.suggestedAction}</div></dd>
              <dt style={{ color: 'var(--text-2)' }}>Safety Flag</dt><dd><span className={`chip ${r.ai?.safetyFlag ? 'chip-red' : 'chip-green'}`}>{r.ai?.safetyFlag ? 'Yes' : 'No'}</span></dd>
            </dl>
          </section>

          <Card title="Request History" icon="history">
            <div className="stack">
              {[
                { name: 'Request Submitted', meta: [formatTimestamp(r.submittedAt || r.createdAt), `By ${r.requesterName} (Requester)`], state: 'done' },
                { name: 'AI Analysis Completed', meta: [r.ai?.analyzedAt ? formatTimestamp(r.ai?.analyzedAt) : 'In progress', `Category: ${r.ai?.category}`, `Priority: ${r.ai?.priority}`, `Safety Flag: ${r.ai?.safetyFlag ? 'Yes' : 'No'}`, `Confidence: ${Math.round((r.ai?.confidence || 0) * ((r.ai?.confidence || 0) <= 1 ? 100 : 1))}%`], state: 'done' },
                { name: r.status === 'Pending Review' ? 'Pending Manager Review' : r.status, meta: [r.status === 'Pending Review' ? 'Awaiting your review and approval.' : 'Review complete.'], state: 'on' },
              ].map((h, i, arr) => (
                <div key={h.name} className="hist-row">
                  <div className="tl-rail">
                    <Icon name={h.state === 'done' ? 'checkCircle' : 'dotCircle'} size={26} style={{ color: h.state === 'done' ? 'var(--green)' : 'var(--blue)' }} />
                    {i < arr.length - 1 && <div className="tl-line" style={{ background: '#C9D3E3' }} />}
                  </div>
                  <div className="hist-name">{h.name}</div>
                  <div className="hist-meta">{h.meta.map((m) => <div key={m}>{m}</div>)}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card title={`Attachments (${(r.photos?.length || 0)})`} icon="fileText" action={<span className="link">View All</span>}>
            <div className="att-row">
              {(r.photos || []).map((p) => <img key={p} className="att-img" src={p} alt="Attachment" />)}
              <button type="button" className="add-more" onClick={() => toast('File upload is not connected in this demo.', 'error')}>
                <Icon name="plusCircle" size={26} style={{ color: 'var(--blue)' }} />Add More
              </button>
            </div>
            <p className="field-hint" style={{ marginTop: 10 }}>Accepted file types: PNG, JPG, PDF (Max 5MB each)</p>
          </Card>
        </div>
      </div>

      {showFull && (
        <Modal title={`${r.id} - full details`} onClose={() => setShowFull(false)} actions={<Button variant="secondary" onClick={() => setShowFull(false)}>Close</Button>}>
          <dl className="kv" style={{ gridTemplateColumns: '120px 1fr', fontSize: 14 }}>
            <dt>Requester</dt><dd>{r.requesterName}</dd>
            <dt>Phone</dt><dd>{r.phone}</dd>
            <dt>Email</dt><dd>{r.email}</dd>
            <dt>Location</dt><dd>{r.location || [r.buildingId, r.roomId].filter(Boolean).join(' / ') || 'Not available'}</dd>
            <dt>Submitted</dt><dd>{formatTimestamp(r.submittedAt || r.createdAt)}</dd>
            <dt>Description</dt><dd>{r.description}</dd>
          </dl>
          {(r.photos?.length || 0) > 0 && <div className="att-row">{(r.photos || []).map((p) => <img key={p} className="att-img" src={p} alt="Attachment" style={{ width: 200, height: 140 }} />)}</div>}
        </Modal>
      )}

      {rejecting && (
        <Modal
          title={`Reject ${r.id}?`}
          onClose={() => setRejecting(false)}
          actions={<><Button variant="secondary" onClick={() => setRejecting(false)}>Cancel</Button><Button variant="danger" onClick={() => { rejectRequest(r.id, rejectNote); toast(`${r.id} rejected`); navigate('/manager/queue'); }}>Reject Request</Button></>}
        >
          <p>The requester will be notified. Add a reason so they know what to do next.</p>
          <Textarea placeholder="Reason for rejection (optional)" value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} />
        </Modal>
      )}
    </div>
  );
}
