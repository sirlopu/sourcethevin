import type { ReactNode } from 'react';

export function AuthCard({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-50 p-6">
      <div className="w-full max-w-md rounded-xl bg-gradient-to-br from-navy-700 to-navy-900 p-8 shadow-[0_12px_32px_rgba(10,31,82,.14)] sm:p-10">
        <div className="mb-8">
          <p className="font-display text-sm font-bold italic tracking-wide text-blue-300">
            Got a trade?
          </p>
          <h1 className="font-display text-3xl font-extrabold italic tracking-tight text-white">
            Source the VIN.
          </h1>
        </div>
        {children}
      </div>
    </div>
  );
}
