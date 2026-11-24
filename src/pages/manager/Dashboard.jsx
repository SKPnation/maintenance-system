import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Card, EmptyState, PageHeader, PriorityPill, StatCard, StatusPill } from '../../components/ui.jsx';
import { useWorkOrderFilters, WorkOrderFilters } from '../../components/WorkOrderFilters.jsx';
import { useStore } from '../../context/StoreContext.jsx';
import { fmtDate, fmtServiceWindow, requestStatus, requestSubmittedAt, toDate } from '../../data/format.js';
import { useManagerScope } from '../../data/managerScope.js';

const OPEN = ['Unassigned', 'Assigned', 'In Progress'];
const isPendingReview = (r) => r.analysisStatus === 'completed' && ['submitted', 'pending review'].includes(String(r.status || '').toLowerCase()) && !r.workOrderId;

// PB-11: Manager Dashboard built from saved work orders the manager is allowed to see.
export default function Dashboard() {
  const { technicians = [], priorityNames = [] } = useStore();
  const { requests, workOrders, categories, label } = useManagerScope();
  const navigate = useNavigate();

  const filterState = useWorkOrderFilters(workOrders);
  const { filtered, active, clear } = filterState;

  const now = Date.now();
  const stats = useMemo(() => ({
    pending: requests.filter(isPendingReview).length,
    open: workOrders.filter((w) => OPEN.includes(w.status)).length,
    inProgress: workOrders.filter((w) => w.status === 'In Progress').length,
    overdue: workOrders.filter((w) => OPEN.includes(w.status) && w.scheduledAt && toDate(w.scheduledAt).getTime() + Number(w.durationHours || 0) * 3600000 < now).length,
    unscheduled: workOrders.filter((w) => OPEN.includes(w.status) && !w.scheduledAt).length,
  }), [requests, workOrders]);

  const techName = (id) => technicians.find((t) => t.id === id)?.name || (id ? 'Former technician' : 'Unassigned');
  const rows = [...filtered].sort((a, b) =>
    (OPEN.includes(b.status) - OPEN.includes(a.status)) ||
    ((toDate(a.scheduledAt)?.getTime() ?? Infinity) - (toDate(b.scheduledAt)?.getTime() ?? Infinity)));

  const recent = [...requests]
    .sort((a, b) => (toDate(requestSubmittedAt(b))?.getTime() || 0) - (toDate(requestSubmittedAt(a))?.getTime() || 0))
    .slice(0, 5);

  return (
    <div className="page-inner">
      <PageHeader
        title="Dashboard"
        subtitle={`Work orders and requests for ${label}.`}
        actions={<Button variant="secondary" icon="queueLine" to="/manager/queue">Open My Queue</Button>}
      />

      <div className="stats" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
        <StatCard tone="blue" icon="clipboard" value={stats.pending} label="Pending review" />
        <StatCard tone="amber" icon="alarm" value={stats.open} label="Open work orders" sub={`${stats.inProgress} in progress`} />
        <StatCard tone="red" icon="alertCircle" iconStyle="solid" value={stats.overdue} label="Overdue" />
        <StatCard tone="green" icon="calendar" value={stats.unscheduled} label="Need a time" />
      </div>

      <Card title={`Work orders (${filtered.length}${active ? ` of ${workOrders.length}` : ''})`} icon="fileText">
        <WorkOrderFilters orders={workOrders} {...filterState} categories={categories} priorities={priorityNames} technicians={technicians} />
        {rows.length === 0 ? (
          <EmptyState
            icon="fileText"
            title={active ? 'No matching work orders' : 'No work orders yet'}
            text={active ? 'No work orders match these filters.' : `Approved requests for ${label} will appear here as work orders.`}
            action={active ? <Button variant="secondary" size="sm" onClick={clear}>Clear filters</Button> : null}
          />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Work order</th><th>Category</th><th>Priority</th><th>Status</th><th>Technician</th><th>Scheduled</th></tr></thead>
              <tbody>
                {rows.map((w) => (
                  <tr key={w.id} className="clickable" onClick={() => navigate(w.scheduledAt ? `/manager/calendar?wo=${encodeURIComponent(w.id)}` : '/manager/work-orders')}>
                    <td style={{ maxWidth: 300 }}><div style={{ fontWeight: 600 }}>{w.title || 'Maintenance work order'}</div><div className="sub">{w.location}</div></td>
                    <td style={{ whiteSpace: 'nowrap' }}>{w.category || '—'}</td>
                    <td><PriorityPill priority={w.priority} size="sm" /></td>
                    <td><StatusPill status={w.status} size="sm" /></td>
                    <td>{techName(w.technicianId)}</td>
                    <td>{w.scheduledAt ? fmtServiceWindow(w.scheduledAt, w.durationHours) : <span className="muted">Not scheduled</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="Recent requests" icon="queueLine" action={<Link className="link" to="/manager/queue">View all</Link>}>
        {recent.length === 0 ? (
          <p className="muted" style={{ fontSize: 14 }}>No requests have been routed to you yet.</p>
        ) : (
          <div className="stack">
            {recent.map((r) => (
              <Link key={r.id} to={`/manager/review/${r.id}`} className="cal-todo" style={{ color: 'inherit' }}>
                <span style={{ minWidth: 0 }}>
                  <strong style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.description}</strong>
                  <span className="muted" style={{ fontSize: 13 }}>{r.routedCategory || 'Awaiting analysis'} · {fmtDate(requestSubmittedAt(r))}</span>
                </span>
                <span className="row gap-8">
                  {r.priority && <PriorityPill priority={r.priority} size="sm" />}
                  <StatusPill status={isPendingReview(r) ? 'Pending Review' : requestStatus(r.status)} size="sm" />
                </span>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
