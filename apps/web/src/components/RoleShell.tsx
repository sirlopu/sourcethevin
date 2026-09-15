import type { ReactNode } from 'react';
import { NotificationBell } from './NotificationBell';
import { useAuth } from '../lib/auth-context';
import logoColor from '../assets/logo-color-full.png';

export function RoleShell({
  title,
  children,
  fullWidth = false,
}: {
  title: string;
  children: ReactNode;
  fullWidth?: boolean;
}) {
  const { signOut } = useAuth();

  return (
    <main className={`mx-auto ${fullWidth ? 'w-full p-4 sm:p-6 lg:p-8' : 'max-w-3xl p-8'}`}>
      <img src={logoColor} alt="SourceTheVIN" className="mb-6 h-12 w-auto" />
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-ink-200 pb-4">
        <h1 className="font-display text-2xl font-bold text-navy-900">{title}</h1>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <button
            type="button"
            onClick={() => {
              void signOut();
            }}
            className="text-sm font-semibold text-blue-500 hover:underline"
          >
            Sign out
          </button>
        </div>
      </div>
      <div className="mt-6">{children}</div>
    </main>
  );
}
