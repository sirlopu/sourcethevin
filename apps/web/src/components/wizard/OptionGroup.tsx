interface Option<T extends string> {
  value: T;
  label: string;
  tone?: 'success' | 'warning' | 'neutral';
}

interface OptionGroupProps<T extends string> {
  label: string;
  value: T | null;
  options: Option<T>[];
  onChange: (value: T) => void;
}

const SELECTED_TONE_CLASSES: Record<NonNullable<Option<string>['tone']>, string> = {
  success: 'border-success bg-success text-white',
  warning: 'border-warning bg-warning text-white',
  neutral: 'border-navy-900 bg-navy-900 text-white',
};

export function OptionGroup<T extends string>({
  label,
  value,
  options,
  onChange,
}: OptionGroupProps<T>) {
  return (
    <div>
      <span className="mb-1.5 block text-xs font-semibold text-ink-700">{label}</span>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={`rounded-md border-[1.5px] px-4 py-2 text-sm font-semibold transition ${
                selected
                  ? SELECTED_TONE_CLASSES[option.tone ?? 'neutral']
                  : 'border-ink-300 bg-white text-ink-700 hover:border-ink-500'
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
