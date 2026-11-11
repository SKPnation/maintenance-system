import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, Card, EmptyState, Input, PageHeader, Pill } from '../../components/ui.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useStore } from '../../context/StoreContext.jsx';
import { fmtServiceWindow, toDate } from '../../data/format.js';

const OPEN = ['Assigned', 'In Progress'];
const initials = (name) => String(name || '?').split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();

// Technicians / Team: who is available and how loaded they are with this category's work.
export default function Team() {
  const { user } = useAuth();
  const { technicians = [], workOrders = [] } = useStore();
  const navigate = useNavigate();
  const [q, setQ] = useState('');

  const now = Date.now();
  const weekEnd = now + 7 * 86400000;

  const rows = useMemo(() => technicians
    .map((t) => {
      const jobs = workOrders.filter((w) => w.technicianId === t.id && w.category === user?.category);
      const open = jobs.filter((w) => OPEN.includes(w.status));
      const upcoming = open
        .filter((w) => w.scheduledAt && toDate(w.scheduledAt).getTime() + Number(w.durationHours || 0) * 3600000 >= now)
        .sort((a, b) => toDate(a.scheduledAt) - toDate(b.scheduledAt));
      return {
        ...t,
        open: open.length,
        inProgress: open.filter((w) => w.status === 'In Progress').length,
        unscheduled: open.filter((w) => !w.scheduledAt).length,
        hoursThisWeek: upcoming.filter((w) => toDate(w.scheduledAt).getTime() < weekEnd).reduce((sum, w) => sum + Number(w.durationHours || 0), 0),
        completed: jobs.filter((w) => w.status === 'Completed').length,
        next: upcoming[0] || null,
      };
    })
    .filter((t) => `${t.name} ${t.trade} ${t.email}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name)), [technicians, workOrders, user?.category, q]);

  return (
    <div className="page-inner">
      <PageHeader title="Technicians / Team" subtitle={`Active technicians and their ${user?.category || 'category'} workload.`} />
      <Card>
        <div className="row between wrap gap-12" style={{ marginBottom: 16 }}>
          <span className="muted" style={{ fontSize: 14 }}>{rows.length} technician{rows.length === 1 ? '' : 's'}</span>
          <Input icon="search" placeholder="Search by name or trade…" value={q} onChange={(e) => setQ(e.target.value)} style={{ width: 300 }} />
        </div>
        {rows.length === 0 ? (
          <EmptyState icon="users" title="No technicians" text={technicians.length ? 'No technicians match your search.' : 'An administrator can add technicians from Users & Roles.'} />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Technician</th><th>Trade</th><th>Open jobs</th><th>Booked next 7 days</th><th>Next job</th><th>Completed</th></tr></thead>
              <tbody>
                {rows.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <div className="row gap-12">
                        <Avatar initials={initials(t.name)} size={36} />
                        <div><div style={{ fontWeight: 600 }}>{t.name}</div><div className="sub">{t.email}</div></div>
                      </div>
                    </td>
                    <td>{t.trade ? <Pill tone="blue" size="sm">{t.trade}</Pill> : <span className="muted">Not set</span>}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{t.open}</div>
                      {(t.inProgress > 0 || t.unscheduled > 0) && <div className="sub">{[t.inProgress && `${t.inProgress} in progress`, t.unscheduled && `${t.unscheduled} unscheduled`].filter(Boolean).join(' · ')}</div>}
                    </td>
                    <td>{t.hoursThisWeek ? `${Math.round(t.hoursThisWeek * 10) / 10} h` : <span className="muted">Free</span>}</td>
                    <td>
                      {t.next ? (
                        <button type="button" className="link" style={{ textAlign: 'left' }} onClick={() => navigate(`/manager/calendar?wo=${encodeURIComponent(t.next.id)}`)}>
                          <div>{t.next.title}</div>
                          <div className="sub">{fmtServiceWindow(t.next.scheduledAt, t.next.durationHours)}</div>
                        </button>
                      ) : <span className="muted">Nothing scheduled</span>}
                    </td>
                    <td>{t.completed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="field-hint" style={{ marginTop: 12 }}>Workload counts only {user?.category || 'your category'} work orders. Technicians may also have jobs from other categories.</p>
      </Card>
    </div>
  );
}
