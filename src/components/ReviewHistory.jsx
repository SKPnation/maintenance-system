import { useEffect, useState } from 'react';
import { configured } from '../firebase.js';
import { useStore } from '../context/StoreContext.jsx';
import { fmtDateTime } from '../data/format.js';

const show = (value) => (value === true ? 'Yes' : value === false ? 'No' : value || '—');

const REASON = {
  unknown: 'not a known category',
  inactive: 'that category is inactive',
  unmapped: 'that category has no manager',
};

// PB-04: who changed what on a request's triage, and when. Internal only.
export default function ReviewHistory({ request, refreshKey }) {
  const { listReviewHistory } = useStore();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!configured) return undefined;
    let live = true;
    setError('');
    listReviewHistory(request.id)
      .then((result) => live && setData(result))
      .catch((e) => live && setError(e.message));
    return () => { live = false; };
  }, [request.id, refreshKey]);

  const ai = data?.original?.ai || request.ai || {};

  return (
    <div className="stack gap-8">
      <div className="note-item">
        <div className="tl-meta"><strong>Original AI recommendation</strong>{ai.analyzedAt ? ` · ${fmtDateTime(ai.analyzedAt)}` : ''}</div>
        <div style={{ fontSize: 13.5 }}>
          Category: {show(ai.category)} · Priority: {show(ai.priority)} · Trade: {show(ai.trade)} · Safety: {show(ai.safetyFlag)}
        </div>
      </div>

      {!configured && <p className="muted" style={{ fontSize: 13.5 }}>Change history is recorded once the app is connected to Firebase.</p>}
      {error && <p className="field-error">{error}</p>}
      {configured && !data && !error && <p className="muted" style={{ fontSize: 13.5 }}>Loading history…</p>}
      {data?.entries?.length === 0 && <p className="muted" style={{ fontSize: 13.5 }}>No manager corrections yet.</p>}

      {[...(data?.entries || [])].reverse().map((entry) => (
        <div key={entry.id} className="note-item">
          <div className="tl-meta">{entry.changedByName || 'Manager'} · {fmtDateTime(entry.changedAt)}</div>
          {entry.changes.map((c) => (
            <div key={c.field} style={{ fontSize: 13.5 }}>
              {c.label}: <s className="muted">{show(c.from)}</s> → <strong>{show(c.to)}</strong>
            </div>
          ))}
          {entry.reroute && (
            <div style={{ fontSize: 13.5 }} className="muted">
              {entry.reroute.toCategory !== entry.reroute.requested
                ? `Sent to ${entry.reroute.toCategory} for manual review (${REASON[entry.reroute.reason] || 'no match'}: "${entry.reroute.requested}").`
                : entry.reroute.movedQueue ? `Moved to the ${entry.reroute.toCategory} manager's queue.` : ''}
            </div>
          )}
          {entry.note && <div style={{ fontSize: 13.5, whiteSpace: 'pre-wrap' }}>Note: {entry.note}</div>}
        </div>
      ))}
    </div>
  );
}
