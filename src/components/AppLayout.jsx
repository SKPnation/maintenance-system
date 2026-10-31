import { Navigate, Outlet } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';
import { useAuth, ROLE_HOME } from '../context/AuthContext.jsx';

// Wraps every signed-in screen. Redirects to login when signed out and to the
// user's own area when they open another role's URL.
export default function AppLayout({ role }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{padding:40}}>Loading account…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to={ROLE_HOME[user.role]} replace />;
  return (
    <div className="app">
      <Sidebar role={role} />
      <div className="main">
        <Topbar />
        <main className="page">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
