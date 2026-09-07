import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PHOTO_SLOTS } from '@sourcethevin/shared';
import type { WizardStepProps } from '../../components/wizard/WizardShell';
import { ApiError } from '../../lib/api';
import { useAuth } from '../../lib/auth-context';
import { useStartSubmission } from '../../lib/useStartSubmission';
import { submitSubmission } from '../../lib/wizard-api';

export default function Step6Review({ submission, onSaved }: WizardStepProps) {
  const { authFetch } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (submission.status === 'submitted') {
    return <SubmittedConfirmation submission={submission} />;
  }

  const vehicleHeading =
    [
      submission.vehicle.year,
      submission.vehicle.make,
      submission.vehicle.model,
      submission.vehicle.trim,
    ]
      .filter(Boolean)
      .join(' ') || 'Vehicle';

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const updated = await submitSubmission(authFetch, submission._id);
      onSaved(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h2 className="font-display text-2xl font-bold text-navy-900">Review &amp; submit</h2>
      <p className="text-sm text-ink-500">
        Double-check the details below, then submit for review.
      </p>

      <div className="mt-5 space-y-4">
        <SummaryCard title={vehicleHeading}>
          <SummaryRow label="VIN" value={submission.vin ?? '—'} mono />
          <SummaryRow label="Mileage" value={submission.vehicle.mileage?.toLocaleString() ?? '—'} />
          <SummaryRow
            label="Drivetrain / engine"
            value={
              [submission.vehicle.drivetrain, submission.vehicle.engine]
                .filter(Boolean)
                .join(' · ') || '—'
            }
          />
        </SummaryCard>

        <SummaryCard title="Condition">
          <SummaryRow label="Runs & drives" value={submission.condition.runsAndDrives ?? '—'} />
          <SummaryRow label="Warning lights" value={submission.condition.warningLights ?? '—'} />
          <SummaryRow
            label="Accident history"
            value={submission.condition.accidentHistory ?? '—'}
          />
        </SummaryCard>

        <SummaryCard title="Trade & payoff">
          <SummaryRow
            label="Expected allowance"
            value={
              submission.payoff.expectedAllowance != null
                ? `$${submission.payoff.expectedAllowance.toLocaleString()}`
                : '—'
            }
          />
          <SummaryRow label="Lien status" value={submission.payoff.lienStatus ?? '—'} />
        </SummaryCard>

        <SummaryCard title="Photos">
          <SummaryRow
            label="Uploaded"
            value={`${submission.photos.length} of ${PHOTO_SLOTS.length}`}
          />
        </SummaryCard>
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm font-medium text-danger">
          {error}
        </p>
      )}

      <button
        type="button"
        disabled={submitting}
        onClick={handleSubmit}
        className="mt-6 w-full rounded-md bg-gradient-to-br from-blue-400 to-blue-600 py-3 font-display font-semibold text-white shadow-[0_4px_14px_rgba(10,75,168,.35)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45"
      >
        {submitting ? 'Submitting…' : 'Submit'}
      </button>
      <button
        type="button"
        onClick={() => navigate('/dashboard')}
        className="mt-2 w-full text-center text-sm font-semibold text-blue-500 hover:underline"
      >
        Save & exit
      </button>
    </div>
  );
}

function SummaryCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-ink-200 p-4">
      <p className="font-display text-sm font-bold text-navy-900">{title}</p>
      <div className="mt-2 space-y-1">{children}</div>
    </div>
  );
}

function SummaryRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-dashed border-ink-200 py-1 text-sm last:border-b-0">
      <span className="text-ink-500">{label}</span>
      <span className={`font-semibold text-ink-900 ${mono ? 'font-mono text-xs' : ''}`}>
        {value}
      </span>
    </div>
  );
}

function SubmittedConfirmation({ submission }: { submission: WizardStepProps['submission'] }) {
  const navigate = useNavigate();
  const startSubmission = useStartSubmission();
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  async function handleStartAnother() {
    setStarting(true);
    setStartError(null);
    try {
      await startSubmission();
    } catch (err) {
      setStartError(
        err instanceof ApiError ? err.message : 'Something went wrong. Please try again.',
      );
      setStarting(false);
    }
  }

  const vehicleHeading =
    [
      submission.vehicle.year,
      submission.vehicle.make,
      submission.vehicle.model,
      submission.vehicle.trim,
    ]
      .filter(Boolean)
      .join(' ') || 'Vehicle';

  return (
    <div className="text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success-bg text-2xl text-success">
        ✓
      </div>
      <h2 className="mt-4 font-display text-2xl font-bold italic text-navy-900">Submitted</h2>
      <p className="font-mono text-xs text-ink-500">{submission.referenceId}</p>

      <div className="mt-5 rounded-md border border-ink-200 p-4 text-left">
        <p className="font-mono text-xs text-ink-500">{submission.vin}</p>
        <p className="font-display text-lg font-bold text-navy-900">{vehicleHeading}</p>
        <div className="mt-3 space-y-1">
          <SummaryRow label="Mileage" value={submission.vehicle.mileage?.toLocaleString() ?? '—'} />
          <SummaryRow label="Photos" value={`${submission.photos.length} uploaded`} />
          <div className="flex items-center justify-between py-1 text-sm">
            <span className="text-ink-500">Status</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-semibold text-blue-600">
              ● New
            </span>
          </div>
        </div>
      </div>

      <p className="mt-4 rounded-md bg-ink-50 p-3 text-left text-xs text-ink-500">
        We&rsquo;re reviewing your submission. You&rsquo;ll get an in-app and email notification
        when an offer is ready.
      </p>

      <button
        type="button"
        onClick={() => navigate('/dashboard')}
        className="mt-5 w-full rounded-md bg-navy-900 py-3 font-display font-semibold text-white hover:bg-navy-800"
      >
        Back to dashboard
      </button>
      <button
        type="button"
        disabled={starting}
        onClick={() => {
          void handleStartAnother();
        }}
        className="mt-2 w-full text-center text-sm font-semibold text-blue-500 hover:underline disabled:cursor-not-allowed disabled:text-ink-300"
      >
        {starting ? 'Starting…' : 'Start another submission'}
      </button>
      {startError && (
        <p role="alert" className="mt-2 text-sm font-medium text-danger">
          {startError}
        </p>
      )}
    </div>
  );
}
