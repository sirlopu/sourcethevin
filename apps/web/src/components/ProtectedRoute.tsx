import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../lib/auth-context';
import { roleHome, type Role } from '../lib/role';

export function ProtectedRoute({
  roles,
  children,
  skipPasswordGate = false,
  forbidden,
}: {
  roles: Role[];
  children: ReactNode;
  skipPasswordGate?: boolean;
  forbidden?: ReactNode;
}) {
  const { user, initializing } = useAuth();

  if (initializing) {
    return null;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (!skipPasswordGate && user.mustChangePassword) {
    return <Navigate to="/change-password" replace />;
  }
  if (!roles.includes(user.role)) {
    return forbidden ?? <Navigate to={roleHome(user.role)} replace />;
  }
  return <>{children}</>;
}
