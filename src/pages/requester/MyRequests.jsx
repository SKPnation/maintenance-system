import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, EmptyState, Input, PageHeader, StatusPill, Tabs } from '../../components/ui.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useStore } from '../../context/StoreContext.jsx';
import { byNewest, fmtDate, fmtServiceWindow, fmtTime, requestStatus, requestSubmittedAt } from '../../data/format.js';

const GROUPS = {
  All: () => true,
  Open: (r) => !['Rejected'].includes(requestStatus(r.status)) && r.workOrderStatus !== 'Completed',
  Completed: (r) => r.workOrderStatus === 'Completed' || requestStatus(r.status) === 'Completed',
  Rejected: (r) => requestStatus(r.status) === 'Rejected',
};

export default function MyRequests() {
  const { user } = useAuth();
  const { requests } = useStore();
  const navigate = useNavigate();
  const [tab, setTab] = useState('All');
  const [q, setQ] = useState('');

  const mine = useMemo(() => requests.filter((r) => r.requesterId === user.id).sort(byNewest), [requests, user.id]);
  const rows = mine.filter(GROUPS[tab]).filter((r) => `${r.id} ${r.description || ''} ${r.location || ''}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="page-inner">
      <PageHeader
        breadcrumbs={[{ label: 'Home', to: '/requester' }, { label: 'My Requests' }]}
        title="My Requests"
        subtitle="Track the status of every maintenance request you've submitted."
        actions={<Button icon="plus" to="/requester/new">New Request</Button>}
      />
      <Card>
        <div className="stack gap-16">
          <div className="row between wrap gap-12">
            <Tabs tabs={Object.keys(GROUPS).map((k) => ({ key: k, label: k, count: mine.filter(GROUPS[k]).length }))} active={tab} onChange={setTab} variant="chips" />
            <Input icon="search" placeholder="Search requests..." value={q} onChange={(e) => setQ(e.target.value)} style={{ width: 300 }} />
          </div>
          {rows.length === 0 ? (
            <EmptyState icon="fileText" title="No requests found" text="Try a different filter or submit a new request." />
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Request #</th><th>Description</th><th>Status</th><th>Service</th><th>Date Submitted</th><th /></tr></thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="clickable" onClick={() => navigate(`/requester/requests/${r.id}`)}>
                      <td>{r.id}</td>
                      <td style={{ maxWidth: 320 }}>{r.description}</td>
                      <td><StatusPill status={requestStatus(r.status)} /></td>
                      <td>{r.serviceScheduledAt ? <span>{fmtServiceWindow(r.serviceScheduledAt, r.serviceDurationHours)}</span> : <span className="muted">Not scheduled</span>}{r.workOrderStatus && <div className="sub">Work: {r.workOrderStatus}</div>}</td>
                      <td><div>{fmtDate(requestSubmittedAt(r))}</div><div className="sub">{fmtTime(requestSubmittedAt(r))}</div></td>
                      <td><Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); navigate(`/requester/requests/${r.id}`); }}>View</Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
