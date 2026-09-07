import type { ReactNode } from 'react';
import { useAuth } from '../lib/auth-context';

export function RoleShell({ title, children }: { title: string; children: ReactNode }) {
  const { signOut } = useAuth();

  return (
    <main className="mx-auto max-w-3xl p-8">
      <div className="flex items-center justify-between border-b border-ink-200 pb-4">
        <h1 className="font-display text-2xl font-bold text-navy-900">{title}</h1>
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
      <div className="mt-6">{children}</div>
    </main>
  );
}
