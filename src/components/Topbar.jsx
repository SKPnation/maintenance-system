import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Icon from './Icon.jsx';
import { Avatar } from './ui.jsx';
import { SEARCH_PLACEHOLDER } from './navConfig.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useStore, unreadCountFor } from '../context/StoreContext.jsx';

export default function Topbar() {
  const { user, signOut } = useAuth();
  const { notifications, resetDemoData } = useStore();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const unread = unreadCountFor(notifications, user.role);

  useEffect(() => {
    const close = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  return (
    <header className="topbar">
      <label className="search">
        <Icon name="search" size={20} strokeWidth={2} />
        <input type="search" placeholder={SEARCH_PLACEHOLDER[user.role]} aria-label="Search" />
      </label>
      <div className="topbar-right">
        <Link to={`/${user.role}/notifications`} className="bell" aria-label={`Notifications, ${unread} unread`}>
          <Icon name="bell" size={28} strokeWidth={1.7} />
          {unread > 0 && <span className="bell-badge">{unread}</span>}
        </Link>
        <div className="user-menu" ref={menuRef}>
          <button type="button" className="user" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="menu">
            <Avatar initials={user.initials} />
            <span className="user-text">
              <span className="user-name">{user.name}</span>
              <span className="user-role">{user.title}</span>
            </span>
            <Icon name="chevronDown" size={18} strokeWidth={2.2} className="user-caret" />
          </button>
          {open && (
            <div className="menu" role="menu">
              <div className="menu-head">
                <div className="user-name">{user.name}</div>
                <div className="menu-email">{user.email}</div>
              </div>
              <button type="button" role="menuitem" className="menu-item" onClick={() => { setOpen(false); navigate('/login'); }}>
                <Icon name="users" size={18} /> Switch role
              </button>
              <button type="button" role="menuitem" className="menu-item" onClick={() => { setOpen(false); resetDemoData(); }}>
                <Icon name="history" size={18} /> Reset demo data
              </button>
              <button type="button" role="menuitem" className="menu-item danger" onClick={() => { signOut(); navigate('/login'); }}>
                <Icon name="logOut" size={18} /> Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
