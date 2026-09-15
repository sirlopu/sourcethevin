import type { ReactNode } from 'react';
import logoOnNavy from '../assets/logo-on-navy-full.png';

export function AuthCard({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-50 p-6">
      <div className="w-full max-w-md rounded-xl bg-gradient-to-br from-navy-700 to-navy-900 p-8 shadow-[0_12px_32px_rgba(10,31,82,.14)] sm:p-10">
        <div className="mb-8">
          <img src={logoOnNavy} alt="SourceTheVIN" className="h-14 w-auto" />
        </div>
        {children}
      </div>
    </div>
  );
}
