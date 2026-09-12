import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import WizardShell from './components/wizard/WizardShell';
import { AuthProvider, useAuth } from './lib/auth-context';
import { roleHome } from './lib/role';
import AdminUserEdit from './pages/AdminUserEdit';
import AdminUsers from './pages/AdminUsers';
import AuditTrail from './pages/AuditTrail';
import ChangePassword from './pages/ChangePassword';
import Dashboard from './pages/Dashboard';
import DeskQueue from './pages/DeskQueue';
import SubmissionDetail from './pages/desk/SubmissionDetail';
import RequestSellerAccess from './pages/RequestSellerAccess';
import SignIn from './pages/SignIn';
import SubmissionView from './pages/SubmissionView';

function RootRedirect() {
  const { user, initializing } = useAuth();
  if (initializing) return null;
  if (!user) return <Navigate to="/login" replace />;
  return (
    <Navigate to={user.mustChangePassword ? '/change-password' : roleHome(user.role)} replace />
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<SignIn />} />
        <Route path="/request-access" element={<RequestSellerAccess />} />
        <Route
          path="/change-password"
          element={
            <ProtectedRoute roles={['seller', 'trade_desk', 'admin']} skipPasswordGate>
              <ChangePassword />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute roles={['seller']}>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/wizard/:id/:step"
          element={
            <ProtectedRoute roles={['seller']}>
              <WizardShell />
            </ProtectedRoute>
          }
        />
        <Route
          path="/desk/queue"
          element={
            <ProtectedRoute roles={['trade_desk']}>
              <DeskQueue />
            </ProtectedRoute>
          }
        />
        <Route
          path="/desk/submissions/:id"
          element={
            <ProtectedRoute roles={['trade_desk']}>
              <SubmissionDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/submissions/:id"
          element={
            <ProtectedRoute roles={['seller']}>
              <SubmissionView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/submissions/:id/audit"
          element={
            <ProtectedRoute roles={['trade_desk', 'admin']}>
              <AuditTrail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute roles={['admin']}>
              <AdminUsers />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users/:id"
          element={
            <ProtectedRoute roles={['admin']}>
              <AdminUserEdit />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
