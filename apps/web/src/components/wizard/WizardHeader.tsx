interface WizardHeaderProps {
  step: number;
  onExit?: () => void;
  exitLabel?: string;
  onBack?: () => void;
}

export function WizardHeader({
  step,
  onExit,
  exitLabel = 'Save & exit',
  onBack,
}: WizardHeaderProps) {
  return (
    <div className="rounded-t-xl bg-gradient-to-br from-navy-700 to-navy-900 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="text-xs font-semibold text-blue-100 hover:text-white"
            >
              ← Back
            </button>
          )}
          <span className="font-mono text-xs font-semibold tracking-wide text-blue-100">
            STEP {step} OF 6
          </span>
        </div>
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
