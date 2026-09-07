import { useState, type FormEvent } from 'react';
import { OptionGroup } from '../../components/wizard/OptionGroup';
import { WizardField } from '../../components/wizard/WizardField';
import { WizardSelect } from '../../components/wizard/WizardSelect';
import type { WizardStepProps } from '../../components/wizard/WizardShell';
import { ApiError } from '../../lib/api';
import { useAuth } from '../../lib/auth-context';
import { useAutosave } from '../../lib/useAutosave';
import { patchSubmission } from '../../lib/wizard-api';
import type { Condition } from '@sourcethevin/shared';

type RunsAndDrives = NonNullable<Condition['runsAndDrives']>;
type WarningLights = NonNullable<Condition['warningLights']>;
type AccidentHistory = NonNullable<Condition['accidentHistory']>;
type ConditionRating = NonNullable<Condition['tireCondition']>;
type CosmeticIssue = Condition['cosmeticIssues'][number];

const COSMETIC_OPTIONS: { value: CosmeticIssue; label: string }[] = [
  { value: 'minor_scratches', label: 'Minor scratches' },
  { value: 'dents', label: 'Dents' },
  { value: 'curbed_wheels', label: 'Curbed wheels' },
  { value: 'interior_wear', label: 'Interior wear' },
];

export default function Step3Condition({ submission, onSaved, onContinue }: WizardStepProps) {
  const { authFetch } = useAuth();
  const c = submission.condition;
  const [runsAndDrives, setRunsAndDrives] = useState<RunsAndDrives | null>(c.runsAndDrives ?? null);
  const [warningLights, setWarningLights] = useState<WarningLights | null>(c.warningLights ?? null);
  const [warningLightsDescription, setWarningLightsDescription] = useState(
    c.warningLightsDescription ?? '',
  );
  const [accidentHistory, setAccidentHistory] = useState<AccidentHistory>(
    c.accidentHistory ?? 'clean',
  );
  const [cosmeticIssues, setCosmeticIssues] = useState<CosmeticIssue[]>(c.cosmeticIssues ?? []);
  const [tireCondition, setTireCondition] = useState<ConditionRating>(c.tireCondition ?? 'good');
  const [windshieldCondition, setWindshieldCondition] = useState<ConditionRating>(
    c.windshieldCondition ?? 'good',
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleCosmetic(value: CosmeticIssue) {
    setCosmeticIssues((current) =>
      current.includes(value) ? current.filter((v) => v !== value) : [...current, value],
    );
  }

  const conditionPatch = {
    condition: {
      runsAndDrives,
      warningLights,
      warningLightsDescription: warningLightsDescription || null,
      accidentHistory,
      cosmeticIssues,
      tireCondition,
      windshieldCondition,
    },
  };
  useAutosave(authFetch, submission._id, conditionPatch, onSaved);

  async function handleContinue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const updated = await patchSubmission(authFetch, submission._id, {
        currentStep: 4,
        ...conditionPatch,
      });
      onSaved(updated);
      onContinue(4);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleContinue} noValidate className="space-y-5">
      <div>
        <h2 className="font-display text-2xl font-bold text-navy-900">Condition</h2>
        <p className="text-sm text-ink-500">Answer honestly — it drives the offer.</p>
      </div>

      <OptionGroup
        label="Mechanical — runs & drives?"
        value={runsAndDrives}
        onChange={setRunsAndDrives}
        options={[
          { value: 'yes', label: 'Yes', tone: 'success' },
          { value: 'starts_only', label: 'Starts only' },
          { value: 'no', label: 'No' },
        ]}
      />

      <div>
        <OptionGroup
          label="Warning lights on?"
          value={warningLights}
          onChange={setWarningLights}
          options={[
            { value: 'none', label: 'None' },
            { value: 'check_engine', label: 'Check engine', tone: 'warning' },
            { value: 'other', label: 'Other' },
          ]}
        />
        {warningLights === 'other' && (
          <WizardField
            label="Which warning light?"
            name="warningLightsDescription"
            className="mt-3 block"
            value={warningLightsDescription}
            onChange={(e) => setWarningLightsDescription(e.target.value)}
          />
        )}
      </div>

      <WizardSelect
        label="Structural / accident history"
        name="accidentHistory"
        value={accidentHistory}
        onChange={(e) => setAccidentHistory(e.target.value as AccidentHistory)}
      >
        <option value="clean">Clean — no known damage</option>
        <option value="repaired">Prior accident — repaired</option>
        <option value="unrepaired">Prior accident — needs repair</option>
      </WizardSelect>

      <div>
        <span className="mb-1.5 block text-xs font-semibold text-ink-700">Cosmetic</span>
        <div className="flex flex-wrap gap-2">
          {COSMETIC_OPTIONS.map((option) => {
            const selected = cosmeticIssues.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => toggleCosmetic(option.value)}
                className={`rounded-full border-[1.5px] px-3 py-1.5 text-xs font-semibold transition ${
                  selected
                    ? 'border-blue-500 bg-blue-500/10 text-blue-600'
                    : 'border-ink-300 bg-white text-ink-700 hover:border-ink-500'
                }`}
              >
                {option.label} {selected && '✓'}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <WizardSelect
          label="Tire condition"
          name="tireCondition"
          value={tireCondition}
          onChange={(e) => setTireCondition(e.target.value as ConditionRating)}
        >
          <option value="good">Good</option>
          <option value="fair">Fair</option>
          <option value="poor">Poor</option>
        </WizardSelect>
        <WizardSelect
          label="Windshield"
          name="windshieldCondition"
          value={windshieldCondition}
          onChange={(e) => setWindshieldCondition(e.target.value as ConditionRating)}
        >
          <option value="good">Good</option>
          <option value="fair">Fair</option>
          <option value="poor">Poor</option>
        </WizardSelect>
      </div>

      {error && (
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-md bg-gradient-to-br from-blue-400 to-blue-600 py-3 font-display font-semibold text-white shadow-[0_4px_14px_rgba(10,75,168,.35)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45"
      >
        {submitting ? 'Saving…' : 'Continue'}
      </button>
    </form>
  );
}
