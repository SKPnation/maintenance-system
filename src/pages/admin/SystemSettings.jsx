import { useEffect, useState } from 'react';
import { Button, Card, EmptyState, Field, Input, PageHeader, SafetyCard, Textarea, Toggle } from '../../components/ui.jsx';
import { useStore } from '../../context/StoreContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { configured } from '../../firebase.js';

// PB-35: the team enters and verifies the facilities emergency contact here.
export default function SystemSettings() {
  const { supportSettings = {}, saveSupportSettings } = useStore();
  const toast = useToast();
  const [form, setForm] = useState({ emergencyLabel: '', emergencyPhone: '', verified: false, routineInfo: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setForm({
      emergencyLabel: supportSettings.emergencyLabel || '',
      emergencyPhone: supportSettings.emergencyPhone || '',
      verified: supportSettings.verified === true,
      routineInfo: supportSettings.routineInfo || '',
    });
  }, [supportSettings.updatedAt?.seconds]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const preview = form.verified && form.emergencyPhone.replace(/\D/g, '').length >= 7
    ? { label: form.emergencyLabel || 'Facilities emergency line', phone: form.emergencyPhone }
    : null;

  const save = async () => {
    setError('');
    setBusy(true);
    try {
      await saveSupportSettings(form);
      toast(form.verified ? 'Facilities contact published to requesters' : 'Saved. The contact stays hidden until it is verified.');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (!configured) {
    return <div className="page-inner"><PageHeader title="System Settings" /><div className="card"><EmptyState icon="settings" title="Connect Firebase" text="Settings are saved in the database. Configure Firebase to manage them." /></div></div>;
  }

  return (
    <div className="page-inner">
      <PageHeader title="System Settings" subtitle="Organization-wide settings." />
      <div className="review-grid">
        <Card title="Facilities emergency contact" icon="phone">
          <div className="stack gap-12">
            <p className="muted" style={{ fontSize: 14 }}>Shown to requesters on Home, New Request, request details and Help &amp; Support, only after the team has verified it.</p>
            <Field label="Contact name" htmlFor="sup-label" hint='e.g. "Facilities Emergency Line"'>
              <Input id="sup-label" maxLength={80} value={form.emergencyLabel} onChange={set('emergencyLabel')} />
            </Field>
            <Field label="Phone number" htmlFor="sup-phone">
              <Input id="sup-phone" icon="phone" type="tel" maxLength={30} value={form.emergencyPhone} onChange={set('emergencyPhone')} />
            </Field>
            <div className="row gap-12" style={{ alignItems: 'center' }}>
              <Toggle checked={form.verified} onChange={(value) => setForm((f) => ({ ...f, verified: value }))} label="Verified by the team" />
              <span style={{ fontSize: 14 }}>Verified by the team: publish this number</span>
            </div>
            <Field label="Routine support details (optional)" htmlFor="sup-routine" hint="Shown on Help & Support, e.g. office hours.">
              <Textarea id="sup-routine" rows={2} maxLength={300} value={form.routineInfo} onChange={set('routineInfo')} />
            </Field>
            {error && <div className="form-alert" role="alert">{error}</div>}
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <Button icon="save" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save'}</Button>
            </div>
          </div>
        </Card>
        <div className="stack gap-8">
          <div className="section-title" style={{ fontSize: 14 }}>What requesters will see</div>
          <SafetyCard contact={preview} showRoutine />
        </div>
      </div>
    </div>
  );
}
