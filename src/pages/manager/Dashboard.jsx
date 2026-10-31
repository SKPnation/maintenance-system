import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useStore } from '../../context/StoreContext.jsx';

const approved = (s) => ['approved','scheduled','in progress','in_progress','completed'].includes(String(s || '').toLowerCase());
const rejected = (s) => ['rejected','cancelled'].includes(String(s || '').toLowerCase());
const dateOf = (v) => v?.toDate?.() || (v?.seconds ? new Date(v.seconds * 1000) : v ? new Date(v) : null);

export default function Dashboard() {
  const { user } = useAuth();
  const { requests = [], workOrders = [] } = useStore();
  const category = user?.category;
  const myRequests = useMemo(() => requests.filter(r => category && (r.routedCategory === category || (!r.routedCategory && r.category === category))), [requests, category]);
  const myOrders = useMemo(() => workOrders.filter(w => category && w.category === category), [workOrders, category]);
  const waiting = myRequests.filter(r => r.analysisStatus === 'completed' && !approved(r.status) && !rejected(r.status));
  const stats = [
    ['Pending Review', waiting.length],
    ['Approved Requests', myRequests.filter(r => approved(r.status)).length],
    ['Active Work Orders', myOrders.filter(w => !['completed','cancelled'].includes(String(w.status || '').toLowerCase())).length],
    ['Completed Work Orders', myOrders.filter(w => String(w.status || '').toLowerCase() === 'completed').length],
  ];
  const recent = [...myRequests].sort((a,b) => (dateOf(b.createdAt || b.submittedAt)?.getTime() || 0) - (dateOf(a.createdAt || a.submittedAt)?.getTime() || 0)).slice(0, 10);
  return <div className="page-inner">
    <h1 className="page-title">{category || 'Manager'} Maintenance Dashboard</h1>
    <p className="page-subtitle">Requests routed to your category and its work orders.</p>
    <div className="stats">{stats.map(([label,count]) => <div className="card" style={{padding:24}} key={label}><h2>{count}</h2><p>{label}</p></div>)}</div>
    <h2>Recent Requests</h2>
    {recent.length ? recent.map(r => <div className="card" style={{padding:15,marginBottom:10}} key={r.id}>
      <Link to={`/manager/review/${r.id}`}>{r.id}</Link> · {r.description} · {r.priority || r.ai?.priority || 'Not prioritized'} · {r.analysisStatus === 'completed' && !approved(r.status) && !rejected(r.status) ? 'Pending Review' : r.status}
    </div>) : <div className="card" style={{padding:20}}>No requests routed to {category || 'your category'} yet.</div>}
    <h2>Recent Work Orders</h2>
    {myOrders.slice(0,10).map(w => <div className="card" style={{padding:15,marginBottom:10}} key={w.id}>{w.title || w.id} · {w.category} · {w.priority} · {w.status}</div>)}
    {!myOrders.length && <div className="card" style={{padding:20}}>No work orders created for this category yet.</div>}
  </div>;
}
