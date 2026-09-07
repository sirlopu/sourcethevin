import type { InputHTMLAttributes } from 'react';

interface WizardFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export function WizardField({ label, id, className, ...props }: WizardFieldProps) {
  const inputId = id ?? props.name;
  return (
    <label htmlFor={inputId} className={className ?? 'block'}>
      <span className="mb-1.5 block text-xs font-semibold text-ink-700">{label}</span>
      <input
        id={inputId}
        className="w-full rounded-md border-[1.5px] border-ink-300 bg-white px-3 py-2.5 text-sm text-ink-900 outline-none transition focus:border-blue-500 focus:ring-[3px] focus:ring-blue-500/15"
        {...props}
      />
    </label>
  );
}
