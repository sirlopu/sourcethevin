import type { ButtonHTMLAttributes } from 'react';

export function SubmitButton({ children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="submit"
      className="w-full rounded-md bg-gradient-to-br from-blue-400 to-blue-600 py-3 font-display font-semibold text-white shadow-[0_4px_14px_rgba(10,75,168,.35)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45"
      {...props}
    >
      {children}
    </button>
  );
}
