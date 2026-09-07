import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import * as api from './api';
import type { Role } from './role';

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  tenantId: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  accessToken: string | null;
  initializing: boolean;
  signIn: (email: string, password: string) => Promise<AuthUser>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function decodeAccessTokenUser(token: string): AuthUser | null {
  try {
    const payloadSegment = token.split('.')[1];
    if (!payloadSegment) return null;
    const claims = JSON.parse(atob(payloadSegment.replace(/-/g, '+').replace(/_/g, '/'))) as {
      sub: string;
      role: Role;
      tenantId: string;
    };
    return { id: claims.sub, email: '', role: claims.role, tenantId: claims.tenantId };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api
      .refresh()
      .then(({ accessToken: token }) => {
        if (cancelled) return;
        setAccessToken(token);
        setUser(decodeAccessTokenUser(token));
      })
      .catch(() => {
        // No valid session cookie — the visitor is simply signed out.
      })
      .finally(() => {
        if (!cancelled) setInitializing(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const result = await api.login(email, password);
    setAccessToken(result.accessToken);
    setUser(result.user);
    return result.user;
  }, []);

  const signOut = useCallback(async () => {
    await api.logout().catch(() => {});
    setAccessToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, accessToken, initializing, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
