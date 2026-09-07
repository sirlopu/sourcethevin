import type { ReactNode, SelectHTMLAttributes } from 'react';

interface WizardSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  children: ReactNode;
}

export function WizardSelect({
  label,
  id,
  name,
  children,
  className,
  ...props
}: WizardSelectProps) {
  const selectId = id ?? name;
  return (
    <label htmlFor={selectId} className={className ?? 'block'}>
      <span className="mb-1.5 block text-xs font-semibold text-ink-700">{label}</span>
      <select
        id={selectId}
        name={name}
        className="w-full rounded-md border-[1.5px] border-ink-300 bg-white px-3 py-2.5 text-sm text-ink-900 outline-none transition focus:border-blue-500 focus:ring-[3px] focus:ring-blue-500/15"
        {...props}
      >
        {children}
      </select>
    </label>
  );
}
