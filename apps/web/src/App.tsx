import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import WizardShell from './components/wizard/WizardShell';
import { AuthProvider, useAuth } from './lib/auth-context';
import { roleHome } from './lib/role';
import AdminUsers from './pages/AdminUsers';
import Dashboard from './pages/Dashboard';
import DeskQueue from './pages/DeskQueue';
import SubmissionDetail from './pages/desk/SubmissionDetail';
import RequestSellerAccess from './pages/RequestSellerAccess';
import SignIn from './pages/SignIn';

function RootRedirect() {
  const { user, initializing } = useAuth();
  if (initializing) return null;
  return <Navigate to={user ? roleHome(user.role) : '/login'} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<SignIn />} />
        <Route path="/request-access" element={<RequestSellerAccess />} />
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
          path="/admin/users"
          element={
            <ProtectedRoute roles={['admin']}>
              <AdminUsers />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
