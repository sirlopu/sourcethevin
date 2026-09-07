import type { InputHTMLAttributes } from 'react';

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export function Field({ label, id, ...props }: FieldProps) {
  const inputId = id ?? props.name;
  return (
    <label htmlFor={inputId} className="mb-4 block">
      <span className="mb-1.5 block text-xs font-semibold text-blue-100">{label}</span>
      <input
        id={inputId}
        className="w-full rounded-md border-2 border-transparent bg-white px-3 py-2.5 text-navy-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-400/30"
        {...props}
      />
    </label>
  );
}
