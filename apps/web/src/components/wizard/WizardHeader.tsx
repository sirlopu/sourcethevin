interface WizardHeaderProps {
  step: number;
  onExit?: () => void;
  exitLabel?: string;
}

export function WizardHeader({ step, onExit, exitLabel = 'Save & exit' }: WizardHeaderProps) {
  return (
    <div className="rounded-t-xl bg-gradient-to-br from-navy-700 to-navy-900 px-6 py-4">
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs font-semibold tracking-wide text-blue-100">
          STEP {step} OF 6
        </span>
        {onExit && (
          <button
            type="button"
            onClick={onExit}
            className="text-xs font-semibold text-blue-100 underline hover:text-white"
          >
            {exitLabel}
          </button>
        )}
      </div>
      <div className="mt-3 flex gap-1">
        {Array.from({ length: 6 }, (_, index) => (
          <div
            key={index}
            className={`h-1 flex-1 rounded-full ${index < step ? 'bg-blue-400' : 'bg-white/20'}`}
          />
        ))}
      </div>
    </div>
  );
}
