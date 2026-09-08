import { useState, type InputHTMLAttributes } from 'react';

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  showPasswordToggle?: boolean;
}

export function Field({ label, id, showPasswordToggle = false, type, ...props }: FieldProps) {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const inputId = id ?? props.name;
  const canTogglePassword = showPasswordToggle && type === 'password';

  return (
    <div className="mb-4">
      <label htmlFor={inputId} className="mb-1.5 block text-xs font-semibold text-blue-100">
        {label}
      </label>
      <div className="relative">
        <input
          id={inputId}
          type={canTogglePassword && passwordVisible ? 'text' : type}
          className={`w-full rounded-md border-2 border-transparent bg-white px-3 py-2.5 text-navy-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-400/30 ${canTogglePassword ? 'pr-12' : ''}`}
          {...props}
        />
        {canTogglePassword && (
          <button
            type="button"
            aria-label={passwordVisible ? 'Hide password' : 'Show password'}
            aria-pressed={passwordVisible}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-blue-700 transition hover:text-navy-900 focus-visible:rounded focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-blue-500"
            onClick={() => setPasswordVisible((visible) => !visible)}
          >
            {passwordVisible ? (
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
              >
                <path d="m3 3 18 18" />
                <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                <path d="M9.9 4.2A10.7 10.7 0 0 1 12 4c5.5 0 9 5 9 5a15.7 15.7 0 0 1-2 2.5" />
                <path d="M6.6 6.6C4.4 8.1 3 10 3 10s3.5 5 9 5a10.7 10.7 0 0 0 3.1-.5" />
              </svg>
            ) : (
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
              >
                <path d="M3 12s3.5-5 9-5 9 5 9 5-3.5 5-9 5-9-5-9-5Z" />
                <circle cx="12" cy="12" r="2" />
              </svg>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
