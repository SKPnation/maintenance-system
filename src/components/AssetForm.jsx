import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { Button, Field, IconButton, Input, Modal, Select, Textarea } from './ui.jsx';
import { useStore } from '../context/StoreContext.jsx';
import { db } from '../firebase.js';

export const ASSET_STATUSES = ['Operational', 'Needs Maintenance', 'Out of Service', 'Retired'];
const TYPES = ['HVAC', 'Electrical', 'Plumbing', 'Appliance', 'IT Equipment', 'Safety', 'Structural', 'Other'];

const BLANK = {
  tag: '', name: '', type: '', category: '', brand: '', model: '', serial: '',
  buildingId: '', roomId: '', locationDetail: '', status: 'Operational',
  installDate: '', warrantyExpiry: '', documents: [],
};

// Same checks as the server, so problems show before saving.
function validate(form, isNew) {
  const e = {};
  if (isNew && !form.tag.trim()) e.tag = 'Enter an asset tag.';
  else if (isNew && !/^[A-Za-z0-9][A-Za-z0-9-]*$/.test(form.tag.trim())) e.tag = 'Use letters, numbers and hyphens only (e.g. AC-204).';
  if (!form.name.trim()) e.name = 'Enter the asset name.';
  if (!form.type) e.type = 'Choose an equipment type.';
  if (!form.category) e.category = 'Choose a category.';
  if (!form.buildingId) e.buildingId = 'Choose a building.';
  if (!form.status) e.status = 'Choose a status.';
  if (form.installDate && form.warrantyExpiry && form.warrantyExpiry < form.installDate) e.warrantyExpiry = "Warranty expiry can't be before the install date.";
  form.documents.forEach((d, i) => {
    if (!d.name.trim() || !/^https:\/\/\S+$/i.test(d.url.trim())) e[`doc${i}`] = 'Each document needs a name and a link starting with https://.';
  });
  return e;
}

// PB-20: Administrator create / edit form for asset records.
export default function AssetForm({ asset, onClose, onSaved }) {
  const { buildings = [], categoryNames = [], createAsset, updateAsset } = useStore();
  const isNew = !asset;
  const [form, setForm] = useState(() => ({ ...BLANK, ...(asset || {}), documents: [...(asset?.documents || [])] }));
  const [rooms, setRooms] = useState([]);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!form.buildingId) { setRooms([]); return undefined; }
    return onSnapshot(collection(db, 'buildings', form.buildingId, 'rooms'), (snapshot) => {
      setRooms(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    }, () => setRooms([]));
  }, [form.buildingId]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value, ...(key === 'buildingId' ? { roomId: '' } : {}) }));
  const setDoc = (index, key) => (e) => setForm((f) => ({ ...f, documents: f.documents.map((d, i) => (i === index ? { ...d, [key]: e.target.value } : d)) }));

  const withCurrent = (list, value) => (value && !list.includes(value) ? [...list, value] : list);

  const save = async () => {
    const e = validate(form, isNew);
    setErrors(e);
    setServerError('');
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      const payload = {
        ...Object.fromEntries(Object.keys(BLANK).map((k) => [k, typeof form[k] === 'string' ? form[k].trim() : form[k]])),
        documents: form.documents.map((d) => ({ name: d.name.trim(), url: d.url.trim() })),
      };
      const result = isNew ? await createAsset(payload) : await updateAsset({ ...payload, id: asset.id, tag: undefined });
      onSaved?.(result?.id || asset?.id);
    } catch (err) {
      setServerError(err.message || 'Could not save the asset.');
    } finally {
      setBusy(false);
    }
  };

  const docError = Object.keys(errors).find((k) => k.startsWith('doc'));

  return (
    <Modal
      title={isNew ? 'Add asset' : `Edit ${asset.tag}`}
      onClose={onClose}
      actions={<><Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button><Button icon="save" onClick={save} disabled={busy}>{busy ? 'Saving…' : isNew ? 'Create asset' : 'Save changes'}</Button></>}
    >
      <div className="stack gap-12" style={{ maxHeight: '70vh', overflowY: 'auto', paddingRight: 4 }}>
        <div className="form-grid-2">
          <Field label="Asset tag" required error={errors.tag} htmlFor="as-tag" hint={isNew ? 'Unique. Letters, numbers and hyphens.' : "Tags can't be changed."}>
            <Input id="as-tag" maxLength={32} value={form.tag} onChange={set('tag')} disabled={!isNew} invalid={!!errors.tag} style={{ textTransform: 'uppercase' }} />
          </Field>
          <Field label="Name" required error={errors.name} htmlFor="as-name"><Input id="as-name" maxLength={120} value={form.name} onChange={set('name')} invalid={!!errors.name} /></Field>
          <Field label="Equipment type" required error={errors.type} htmlFor="as-type"><Select id="as-type" placeholder="Select a type" options={withCurrent(TYPES, form.type)} value={form.type} onChange={set('type')} invalid={!!errors.type} /></Field>
          <Field label="Category" required error={errors.category} htmlFor="as-cat"><Select id="as-cat" placeholder="Select a category" options={withCurrent(categoryNames, form.category)} value={form.category} onChange={set('category')} invalid={!!errors.category} /></Field>
          <Field label="Brand" htmlFor="as-brand"><Input id="as-brand" maxLength={120} value={form.brand} onChange={set('brand')} /></Field>
          <Field label="Model" htmlFor="as-model"><Input id="as-model" maxLength={120} value={form.model} onChange={set('model')} /></Field>
          <Field label="Serial number" htmlFor="as-serial"><Input id="as-serial" maxLength={80} value={form.serial} onChange={set('serial')} /></Field>
          <Field label="Status" required error={errors.status} htmlFor="as-status"><Select id="as-status" options={ASSET_STATUSES} value={form.status} onChange={set('status')} /></Field>
          <Field label="Building" required error={errors.buildingId} htmlFor="as-bldg"><Select id="as-bldg" placeholder="Select a building" options={buildings.map((b) => ({ value: b.id, label: b.name }))} value={form.buildingId} onChange={set('buildingId')} invalid={!!errors.buildingId} /></Field>
          <Field label="Room" htmlFor="as-room"><Select id="as-room" placeholder={form.buildingId ? 'No specific room' : 'Choose a building first'} options={rooms.map((r) => ({ value: r.id, label: r.name }))} value={form.roomId} onChange={set('roomId')} disabled={!form.buildingId} /></Field>
          <Field label="Install date" htmlFor="as-install"><div className="input"><input id="as-install" type="date" value={form.installDate} onChange={set('installDate')} /></div></Field>
          <Field label="Warranty expiry" error={errors.warrantyExpiry} htmlFor="as-warranty"><div className={`input ${errors.warrantyExpiry ? 'is-invalid' : ''}`}><input id="as-warranty" type="date" value={form.warrantyExpiry} onChange={set('warrantyExpiry')} /></div></Field>
        </div>
        <Field label="Location details" htmlFor="as-locd" hint="e.g. Engineering Building, 2nd floor, above desk 4"><Textarea id="as-locd" rows={2} maxLength={200} value={form.locationDetail} onChange={set('locationDetail')} /></Field>

        <div className="stack gap-8">
          <div className="section-title" style={{ fontSize: 14 }}>Related documents</div>
          {form.documents.length === 0 && <p className="muted" style={{ fontSize: 13.5 }}>Link manuals, warranty certificates or service reports.</p>}
          {form.documents.map((d, i) => (
            <div key={i} className="row gap-8" style={{ alignItems: 'center' }}>
              <Input placeholder="Name, e.g. User manual" aria-label={`Document ${i + 1} name`} value={d.name} onChange={setDoc(i, 'name')} style={{ flex: 1 }} />
              <Input placeholder="https://…" aria-label={`Document ${i + 1} link`} value={d.url} onChange={setDoc(i, 'url')} style={{ flex: 2 }} />
              <IconButton icon="x" label={`Remove document ${i + 1}`} onClick={() => setForm((f) => ({ ...f, documents: f.documents.filter((_, j) => j !== i) }))} />
            </div>
          ))}
          {docError && <p className="field-error">{errors[docError]}</p>}
          {form.documents.length < 10 && <Button variant="ghost" size="sm" icon="plus" onClick={() => setForm((f) => ({ ...f, documents: [...f.documents, { name: '', url: '' }] }))}>Add document</Button>}
        </div>

        {serverError && <div className="form-alert" role="alert">{serverError}</div>}
      </div>
    </Modal>
  );
}
