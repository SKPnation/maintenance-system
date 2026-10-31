import { NavLink, useNavigate } from 'react-router-dom';
import Icon, { BrandMark } from './Icon.jsx';
import { NAV } from './navConfig.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useStore, unreadCountFor } from '../context/StoreContext.jsx';

function NavItem({ item, badgeValue, muted }) {
  return (
    <NavLink to={item.to} end={item.end} className={({ isActive }) => `nav-item ${isActive ? 'on' : ''} ${muted ? 'muted' : ''}`}>
      {({ isActive }) => (
        <>
          <Icon name={isActive && item.activeIcon ? item.activeIcon : item.icon} size={22} strokeWidth={1.7} />
          <span className="nav-label">{item.label}</span>
          {badgeValue > 0 && <span className={`nav-badge ${item.badge === 'queue' ? 'nav-badge-queue' : ''}`}>{badgeValue}</span>}
        </>
      )}
    </NavLink>
  );
}

export default function Sidebar({ role }) {
  const nav = NAV[role];
  const { signOut } = useAuth();
  const { notifications, requests } = useStore();
  const navigate = useNavigate();

  const counts = {
    notifications: unreadCountFor(notifications, role),
    queue: requests.filter((r) => r.status === 'Pending Review').length,
  };
  const notif = { ...nav.notifications, badge: 'notifications' };

  return (
    <aside className="sidebar" aria-label="Main navigation">
      <div className="sidebar-top">
        <div className="brand">
          <BrandMark size={40} />
          <div className="brand-name">Maintenance<br />System</div>
        </div>

        {nav.groups.map((g, gi) => {
          const isLast = gi === nav.groups.length - 1;
          return (
            <div key={g.label || gi}>
              {g.label && <div className={`nav-section ${g.tight ? 'tight' : ''}`}>{g.label}</div>}
              <div className="nav-group">
                {g.items.map((it) => <NavItem key={it.to} item={it} badgeValue={it.badge ? counts[it.badge] : 0} />)}
                {isLast && nav.notificationsInGroup && <NavItem item={notif} badgeValue={counts.notifications} />}
              </div>
            </div>
          );
        })}

        {!nav.notificationsInGroup && (
          <>
            {role !== 'requester' && <div className="nav-divider" />}
            <div className="nav-group">
              <NavItem item={notif} badgeValue={counts.notifications} />
            </div>
          </>
        )}
      </div>

      <div className="nav-group nav-bottom">
        {nav.bottom.map((it) => <NavItem key={it.to} item={it} muted />)}
        <button type="button" className="nav-item muted" onClick={() => { signOut(); navigate('/login'); }}>
          <Icon name="logOut" size={22} strokeWidth={1.7} />
          <span className="nav-label">Log Out</span>
        </button>
      </div>
    </aside>
  );
}
