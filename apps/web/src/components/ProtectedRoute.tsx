import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../lib/auth-context';
import { roleHome, type Role } from '../lib/role';

export function ProtectedRoute({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { user, initializing } = useAuth();

  if (initializing) {
    return null;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (!roles.includes(user.role)) {
    return <Navigate to={roleHome(user.role)} replace />;
  }
  return <>{children}</>;
}
