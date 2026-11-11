import { Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from './components/AppLayout.jsx';
import { useAuth, ROLE_HOME } from './context/AuthContext.jsx';

import SignIn from './pages/auth/SignIn.jsx';
import RequesterHome from './pages/requester/Home.jsx';
import NewRequest from './pages/requester/NewRequest.jsx';
import RequestDetail from './pages/requester/RequestDetail.jsx';
import MyRequests from './pages/requester/MyRequests.jsx';
import ManagerQueue from './pages/manager/Queue.jsx';
import ReviewWorkOrder from './pages/manager/ReviewWorkOrder.jsx';
import MyTasks from './pages/technician/MyTasks.jsx';
import Assets from './pages/shared/Assets.jsx';
import Notifications from './pages/shared/Notifications.jsx';
import ComingSoon from './pages/shared/ComingSoon.jsx';
import PriorityLevels from './pages/admin/PriorityLevels.jsx';
import UsersRoles from './pages/admin/UsersRoles.jsx';
import Locations from './pages/admin/Locations.jsx';
import WorkOrders from './pages/manager/WorkOrders.jsx';
import ManagerDashboard from './pages/manager/Dashboard.jsx';
import ManagerCalendar from './pages/manager/Calendar.jsx';
import Triage from './pages/manager/Triage.jsx';
import TechnicianCalendar from './pages/technician/Calendar.jsx';
import Team from './pages/manager/Team.jsx';

function HomeRedirect() {
  const { user, loading, authError } = useAuth();

  if (loading) {
    return <div>Loading your account...</div>;
  }

  if (user?.role && ROLE_HOME[user.role]) {
    return <Navigate to={ROLE_HOME[user.role]} replace />;
  }

  if (authError) {
    return <div role="alert">{authError}</div>;
  }

  return <Navigate to="/signin" replace />;
}

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ padding: 40 }}>Loading account…</div>;
  return <Navigate to={user ? ROLE_HOME[user.role] : '/login'} replace />;
}

// Screens that are in the navigation but not designed yet.
const soon = (title, text) => <ComingSoon title={title} text={text} />;

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />

      <Route path="/login" element={<SignIn />} />

      <Route path="/requester" element={<AppLayout role="requester" />}>
        <Route index element={<RequesterHome />} />
        <Route path="new" element={<NewRequest />} />
        <Route path="requests" element={<MyRequests />} />
        <Route path="requests/:id" element={<RequestDetail />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="help" element={soon('Help & Support', 'FAQs and contact options for facilities support.')} />
      </Route>

      <Route path="/manager" element={<AppLayout role="manager" />}>
        <Route index element={<Navigate to="queue" replace />} />
        <Route path="queue" element={<ManagerQueue />} /><Route path="triage" element={<Triage />} />
        <Route path="review/:id" element={<ReviewWorkOrder />} />
        <Route path="assets" element={<Assets />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="dashboard" element={<ManagerDashboard />} />
        <Route path="work-orders" element={<WorkOrders />} />
        <Route path="calendar" element={<ManagerCalendar />} />
        <Route path="team" element={<Team />} />
        <Route path="reports" element={soon('Reports', 'Response and resolution metrics for your category.')} />
        <Route path="settings" element={soon('Settings', 'Profile and notification preferences.')} />
      </Route>

      <Route path="/technician" element={<AppLayout role="technician" />}>
        <Route index element={<Navigate to="tasks" replace />} />
        <Route path="tasks" element={<MyTasks />} />
        <Route path="assets" element={<Assets />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="dashboard" element={soon('Dashboard', "Today's jobs, overdue work and upcoming assignments.")} />
        <Route path="calendar" element={<TechnicianCalendar />} />
        <Route path="inventory" element={soon('Parts / Inventory', 'Record parts and materials used on work orders. Planned for a later sprint.')} />
        <Route path="settings" element={soon('Settings', 'Profile and notification preferences.')} />
      </Route>

      <Route path="/admin" element={<AppLayout role="admin" />}>
        <Route index element={<Navigate to="priority-levels" replace />} />
        <Route path="priority-levels" element={<PriorityLevels />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="dashboard" element={soon('Dashboard', 'System-wide activity and configuration health.')} />
        <Route path="users" element={<UsersRoles />} />
        <Route path="reports" element={soon('Reports', 'Organization-wide maintenance reporting.')} />
        <Route path="categories" element={soon('Categories', 'Maintenance categories used by the AI and routing rules.')} />
        <Route path="trades" element={soon('Trades', 'Technician trades and skills.')} />
        <Route path="routing-rules" element={soon('Routing Rules', 'Rules that route requests to the right manager.')} />
        <Route path="locations" element={<Locations />} />
        <Route path="system-settings" element={soon('System Settings', 'Organization-wide settings.')} />
        <Route path="audit-logs" element={soon('Audit Logs', 'A record of changes made in the system.')} />
      </Route>

      <Route path="*" element={<RootRedirect />} />
    </Routes>
  );
}
