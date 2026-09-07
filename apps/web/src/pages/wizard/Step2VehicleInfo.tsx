import { useState, type FormEvent } from 'react';
import { WizardField } from '../../components/wizard/WizardField';
import type { WizardStepProps } from '../../components/wizard/WizardShell';
import { ApiError } from '../../lib/api';
import { useAuth } from '../../lib/auth-context';
import { useAutosave } from '../../lib/useAutosave';
import { patchSubmission } from '../../lib/wizard-api';

export default function Step2VehicleInfo({ submission, onSaved, onContinue }: WizardStepProps) {
  const { authFetch } = useAuth();
  const [year, setYear] = useState(submission.vehicle.year?.toString() ?? '');
  const [make, setMake] = useState(submission.vehicle.make ?? '');
  const [model, setModel] = useState(submission.vehicle.model ?? '');
  const [trim, setTrim] = useState(submission.vehicle.trim ?? '');
  const [mileage, setMileage] = useState(submission.vehicle.mileage?.toString() ?? '');
  const [exteriorColor, setExteriorColor] = useState(submission.vehicle.exteriorColor ?? '');
  const [drivetrain, setDrivetrain] = useState(submission.vehicle.drivetrain ?? '');
  const [engine, setEngine] = useState(submission.vehicle.engine ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const vehiclePatch = {
    vehicle: {
      year: year ? Number(year) : null,
      make: make || null,
      model: model || null,
      trim: trim || null,
      mileage: mileage ? Number(mileage) : null,
      exteriorColor: exteriorColor || null,
      drivetrain: drivetrain || null,
      engine: engine || null,
    },
  };
  useAutosave(authFetch, submission._id, vehiclePatch, onSaved);

  async function handleContinue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const updated = await patchSubmission(authFetch, submission._id, {
        currentStep: 3,
        ...vehiclePatch,
      });
      onSaved(updated);
      onContinue(3);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const heading = [year, make, model, trim].filter(Boolean).join(' ') || 'Vehicle info';

  return (
    <form onSubmit={handleContinue} noValidate>
      <span className="inline-flex items-center gap-1.5 rounded-full bg-success-bg px-2.5 py-1 text-xs font-semibold text-success">
        ● Decoded from vPIC
      </span>
      <h2 className="mt-2 font-display text-2xl font-bold text-navy-900">{heading}</h2>
      <p className="font-mono text-xs text-ink-500">{submission.vin}</p>

      <div className="mt-6 grid grid-cols-2 gap-4">
        <WizardField
          label="Year"
          name="year"
          type="number"
          value={year}
          onChange={(e) => setYear(e.target.value)}
        />
        <WizardField
          label="Make"
          name="make"
          value={make}
          onChange={(e) => setMake(e.target.value)}
        />
        <WizardField
          label="Model"
          name="model"
          value={model}
          onChange={(e) => setModel(e.target.value)}
        />
        <WizardField
          label="Trim"
          name="trim"
          value={trim}
          onChange={(e) => setTrim(e.target.value)}
        />
        <WizardField
          label="Mileage"
          name="mileage"
          type="number"
          value={mileage}
          onChange={(e) => setMileage(e.target.value)}
        />
        <WizardField
          label="Color"
          name="exteriorColor"
          value={exteriorColor}
          onChange={(e) => setExteriorColor(e.target.value)}
        />
      </div>

      <div className="mt-4">
        <span className="mb-1.5 block text-xs font-semibold text-ink-700">Drivetrain / engine</span>
        <div className="grid grid-cols-2 gap-4">
          <WizardField
            label=""
            name="drivetrain"
            placeholder="FWD"
            value={drivetrain}
            onChange={(e) => setDrivetrain(e.target.value)}
            className="[&>span]:hidden"
          />
          <WizardField
            label=""
            name="engine"
            placeholder="2.4L I4"
            value={engine}
            onChange={(e) => setEngine(e.target.value)}
            className="[&>span]:hidden"
          />
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm font-medium text-danger">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="mt-6 w-full rounded-md bg-gradient-to-br from-blue-400 to-blue-600 py-3 font-display font-semibold text-white shadow-[0_4px_14px_rgba(10,75,168,.35)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45"
      >
        {submitting ? 'Saving…' : 'Continue'}
      </button>
    </form>
  );
}
