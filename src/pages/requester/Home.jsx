import { Link, useNavigate } from 'react-router-dom';
import Icon from '../../components/Icon.jsx';
import HeroIllustration from '../../components/HeroIllustration.jsx';
import { Button, Card, KebabButton, SafetyCard, StatusPill } from '../../components/ui.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useStore } from '../../context/StoreContext.jsx';
import { EMERGENCY_PHONE } from '../../data/mock.js';
import { fmtDate, fmtTime, greeting } from '../../data/format.js';

export default function RequesterHome() {
  const { user } = useAuth();
  const { requests } = useStore();
  const navigate = useNavigate();
  const mine = requests
    .filter((r) => r.requesterId === user.id)
    .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
    .slice(0, 5);

  return (
    <div className="page-inner">
      <div className="two-col">
        <div className="stack gap-20">
          <div style={{ paddingLeft: 10 }}>
            <div className="greeting-small">{greeting()},</div>
            <h1 className="greeting-name">{user.name} <span aria-hidden="true" style={{ fontSize: 44, letterSpacing: 0 }}>👋</span></h1>
            <p className="greeting-sub">Report a maintenance issue and we’ll get it to the right team.</p>
          </div>

          <section className="hero-card">
            <div className="hero-card-text">
              <h2 className="hero-card-title">Submit a New<br />Maintenance Request</h2>
              <p className="hero-card-desc">Describe the problem in your own words. You don’t need to choose a category - we’ll take care of that.</p>
              <Link to="/requester/new" className="btn btn-primary btn-lg">
                <span className="btn-plus"><Icon name="plus" size={18} strokeWidth={2.8} /></span>
                <span>Submit a Request</span>
                <Icon name="arrowRight" size={22} strokeWidth={2.2} />
              </Link>
            </div>
            <HeroIllustration />
          </section>

          <Card title="My Recent Requests" action={<Link to="/requester/requests" className="link">View all</Link>}>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr><th>Request #</th><th>Description</th><th>Status</th><th>Date Submitted</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {mine.map((r) => (
                    <tr key={r.id}>
                      <td>{r.id}</td>
                      <td>{r.description.length > 34 ? `${r.description.slice(0, 32)}…` : r.description}</td>
                      <td><StatusPill status={r.status} /></td>
                      <td><div>{fmtDate(r.submittedAt)}</div><div className="sub">{fmtTime(r.submittedAt)}</div></td>
                      <td>
                        <div className="cell-actions">
                          <Button variant="ghost" size="sm" onClick={() => navigate(`/requester/requests/${r.id}`)}>View</Button>
                          <KebabButton />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <div className="right-col">
          <Card title="Quick Actions">
            <div className="qa-list">
              <Link to="/requester/new" className="qa-item primary">
                <span className="qa-icon"><Icon name="plus" size={24} strokeWidth={2.4} /></span>
                <span><span className="qa-name" style={{ display: 'block' }}>Submit a New Request</span><span className="qa-desc" style={{ display: 'block' }}>Report a maintenance issue</span></span>
              </Link>
              <Link to="/requester/requests" className="qa-item">
                <span className="qa-icon"><Icon name="docSolid" size={24} /></span>
                <span><span className="qa-name" style={{ display: 'block' }}>View My Requests</span><span className="qa-desc" style={{ display: 'block' }}>Track the status of your requests</span></span>
              </Link>
            </div>
          </Card>

          <section className="tip">
            <Icon name="bulb" size={40} />
            <div>
              <div className="tip-title">Tip</div>
              <p className="tip-text">Just describe the problem in your own words. Our system will automatically identify the category and route it to the right team.</p>
            </div>
          </section>

          <SafetyCard phone={EMERGENCY_PHONE} />
        </div>
      </div>
    </div>
  );
}
