import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, EmptyState, Input, PageHeader, StatusPill, Tabs } from '../../components/ui.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useStore } from '../../context/StoreContext.jsx';
import { fmtDate, fmtTime } from '../../data/format.js';

const GROUPS = {
  All: () => true,
  Open: (r) => ['Submitted', 'Pending Review', 'Under Review', 'Approved', 'In Progress'].includes(r.status),
  Completed: (r) => r.status === 'Completed',
  Rejected: (r) => r.status === 'Rejected',
};

export default function MyRequests() {
  const { user } = useAuth();
  const { requests } = useStore();
  const navigate = useNavigate();
  const [tab, setTab] = useState('All');
  const [q, setQ] = useState('');

  const mine = useMemo(() => requests.filter((r) => r.requesterId === user.id).sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt)), [requests, user.id]);
  const rows = mine.filter(GROUPS[tab]).filter((r) => `${r.id} ${r.description} ${r.location}`.toLowerCase().includes(q.toLowerCase()));

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
                <thead><tr><th>Request #</th><th>Description</th><th>Location</th><th>Status</th><th>Date Submitted</th><th /></tr></thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="clickable" onClick={() => navigate(`/requester/requests/${r.id}`)}>
                      <td>{r.id}</td>
                      <td style={{ maxWidth: 320 }}>{r.description}</td>
                      <td>{r.location}</td>
                      <td><StatusPill status={r.status} /></td>
                      <td><div>{fmtDate(r.submittedAt)}</div><div className="sub">{fmtTime(r.submittedAt)}</div></td>
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
