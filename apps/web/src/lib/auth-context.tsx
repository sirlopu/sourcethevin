import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import * as api from './api';
import type { Role } from './role';

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  tenantId: string;
  mustChangePassword: boolean;
}

export type AuthFetch = (path: string, init?: RequestInit) => Promise<Response>;

interface AuthContextValue {
  user: AuthUser | null;
  accessToken: string | null;
  initializing: boolean;
  signIn: (email: string, password: string) => Promise<AuthUser>;
  signOut: () => Promise<void>;
  /** Re-run the silent refresh to pull a fresh access token (e.g. after changing password). */
  refreshSession: () => Promise<void>;
  /** fetch() against the API, attaching the access token and retrying once after a silent refresh on 401. */
  authFetch: AuthFetch;
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
      mustChangePassword: boolean;
    };
    return {
      id: claims.sub,
      email: '',
      role: claims.role,
      tenantId: claims.tenantId,
      mustChangePassword: claims.mustChangePassword,
    };
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

  const refreshSession = useCallback(async () => {
    const { accessToken: token } = await api.refresh();
    setAccessToken(token);
    setUser(decodeAccessTokenUser(token));
  }, []);

  const signOut = useCallback(async () => {
    await api.logout().catch(() => {});
    setAccessToken(null);
    setUser(null);
  }, []);

  const authFetch = useCallback<AuthFetch>(
    async (path, init = {}) => {
      const request = (token: string | null) =>
        fetch(`${api.API_BASE_URL}${path}`, {
          ...init,
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...init.headers,
          },
        });

      const response = await request(accessToken);
      if (response.status !== 401) {
        return response;
      }

      try {
        const refreshed = await api.refresh();
        setAccessToken(refreshed.accessToken);
        setUser((current) => current ?? decodeAccessTokenUser(refreshed.accessToken));
        return await request(refreshed.accessToken);
      } catch {
        setAccessToken(null);
        setUser(null);
        return response;
      }
    },
    [accessToken],
  );

  return (
    <AuthContext.Provider
      value={{ user, accessToken, initializing, signIn, signOut, refreshSession, authFetch }}
    >
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
