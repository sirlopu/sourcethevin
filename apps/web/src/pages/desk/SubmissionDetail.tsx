import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ApiError } from '../../lib/api';
import { useAuth } from '../../lib/auth-context';
import {
  getSubmissionDetail,
  overrideValuation,
  saveValuation,
  type BidReference,
  type EstimatedExpenses,
  type SubmissionListItem,
} from '../../lib/desk-api';
import { formatRelativeAge } from '../../lib/relative-time';

const EMPTY_EXPENSES: EstimatedExpenses = {
  transport: 0,
  recon: 0,
  arbitrationCondition: 0,
  other: 0,
};

export default function SubmissionDetail() {
  const { id } = useParams<{ id: string }>();
  const { authFetch } = useAuth();
  const [submission, setSubmission] = useState<SubmissionListItem | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    getSubmissionDetail(authFetch, id)
      .then((result) => {
        if (!cancelled) setSubmission(result);
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setError(err instanceof ApiError ? err.message : 'Unable to load this submission.');
      });
    return () => {
      cancelled = true;
    };
  }, [id, authFetch]);

  if (error) {
    return (
      <main className="mx-auto max-w-5xl p-8">
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      </main>
    );
  }
  if (!submission || !id) {
    return (
      <main className="mx-auto max-w-5xl p-8">
        <p className="text-sm text-ink-500">Loading…</p>
      </main>
    );
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
    <main className="mx-auto max-w-5xl p-8">
      <Link to="/desk/queue" className="text-sm font-semibold text-blue-500 hover:underline">
        ← Back to queue
      </Link>

      <div className="mt-2 flex items-center gap-2">
        <p className="font-mono text-xs text-ink-500">{submission.referenceId}</p>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-semibold text-blue-600">
          ● New
        </span>
      </div>
      <h1 className="font-display text-2xl font-bold text-navy-900">{vehicleHeading}</h1>
      <p className="text-sm text-ink-500">
        {submission.vin} · from {submission.seller?.email ?? 'unknown seller'}
        {submission.seller?.dealershipName ? `, ${submission.seller.dealershipName}` : ''}
      </p>

      {submission.photos.length > 0 && (
        <div className="mt-4 flex gap-2 overflow-x-auto">
          {submission.photos.map((photo) => (
            <img
              key={photo.slot}
              src={photo.url}
              alt={photo.slot}
              className="h-20 w-20 flex-shrink-0 rounded-md border border-ink-200 object-cover"
            />
          ))}
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Card title="Vehicle & condition">
            <Row label="Mileage" value={submission.vehicle.mileage?.toLocaleString() ?? '—'} />
            <Row
              label="Drivetrain"
              value={
                [submission.vehicle.drivetrain, submission.vehicle.engine]
                  .filter(Boolean)
                  .join(' · ') || '—'
              }
            />
            <Row label="Runs & drives" value={submission.condition.runsAndDrives ?? '—'} />
            <Row label="Warning lights" value={submission.condition.warningLights ?? '—'} />
            <Row label="Structural" value={submission.condition.accidentHistory ?? '—'} />
            <Row
              label="Cosmetic"
              value={submission.condition.cosmeticIssues.join(', ') || 'None reported'}
            />
            <Row label="Tires" value={submission.condition.tireCondition ?? '—'} />
            <Row label="Windshield" value={submission.condition.windshieldCondition ?? '—'} />
          </Card>

          <Card title="Trade & payoff">
            <Row
              label="Customer expectation"
              value={
                submission.payoff.expectedAllowance != null
                  ? `$${submission.payoff.expectedAllowance.toLocaleString()}`
                  : '—'
              }
            />
            <Row
              label="Lien payoff"
              value={
                submission.payoff.payoffAmount != null
                  ? `$${submission.payoff.payoffAmount.toLocaleString()}${submission.payoff.lienHolder ? ` · ${submission.payoff.lienHolder}` : ''}`
                  : '—'
              }
            />
            <Row label="Title" value={submission.payoff.titleStatus ?? '—'} />
            {submission.payoff.sellerNotes && (
              <p className="mt-2 rounded-md bg-ink-50 p-3 text-sm text-ink-700">
                <span className="font-semibold">Seller note: </span>
                {submission.payoff.sellerNotes}
              </p>
            )}
          </Card>

          {submission.valuation !== undefined && (
            <InternalNotesCard
              submissionId={id}
              authFetch={authFetch}
              valuation={submission.valuation}
            />
          )}
        </div>

        {submission.valuation !== undefined && (
          <ValuationWorkspacePanel
            submissionId={id}
            authFetch={authFetch}
            initial={submission.valuation}
          />
        )}
      </div>
    </main>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-ink-200 bg-white p-5">
      <p className="font-display text-sm font-bold text-navy-900">{title}</p>
      <div className="mt-3 space-y-1">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-dashed border-ink-200 py-1.5 text-sm last:border-b-0">
      <span className="text-ink-500">{label}</span>
      <span className="font-semibold text-ink-900">{value}</span>
    </div>
  );
}

function InternalNotesCard({
  submissionId,
  authFetch,
  valuation,
}: {
  submissionId: string;
  authFetch: ReturnType<typeof useAuth>['authFetch'];
  valuation: SubmissionListItem['valuation'];
}) {
  const [notes, setNotes] = useState(valuation?.internalNotes ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await saveValuation(authFetch, submissionId, {
        bidReferences: valuation?.bidReferences.map((b) => ({ ...b })) ?? [],
        estimatedExpenses: valuation?.estimatedExpenses ?? EMPTY_EXPENSES,
        targetMargin: valuation?.targetMargin ?? 0,
        internalNotes: notes,
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to save notes.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-md border border-ink-200 bg-white p-5">
      <div className="flex items-center gap-2">
        <p className="font-display text-sm font-bold text-navy-900">Internal notes</p>
        <span className="inline-flex items-center gap-1 rounded-full bg-ink-100 px-2 py-0.5 text-[11px] font-semibold text-ink-600">
          🔒 Not visible to seller
        </span>
      </div>
      <textarea
        rows={3}
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        className="mt-3 w-full rounded-md border-[1.5px] border-ink-300 bg-white px-3 py-2 text-sm text-ink-900 outline-none focus:border-blue-500 focus:ring-[3px] focus:ring-blue-500/15"
      />
      {error && (
        <p role="alert" className="mt-2 text-sm font-medium text-danger">
          {error}
        </p>
      )}
      <button
        type="button"
        disabled={saving}
        onClick={() => {
          void handleSave();
        }}
        className="mt-2 rounded-md border-[1.5px] border-navy-900 px-3 py-1.5 text-sm font-semibold text-navy-900 hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save notes'}
      </button>
    </div>
  );
}

function ValuationWorkspacePanel({
  submissionId,
  authFetch,
  initial,
}: {
  submissionId: string;
  authFetch: ReturnType<typeof useAuth>['authFetch'];
  initial: SubmissionListItem['valuation'];
}) {
  const [bidReferences, setBidReferences] = useState<BidReference[]>(initial?.bidReferences ?? []);
  const [newSource, setNewSource] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [expenses, setExpenses] = useState<EstimatedExpenses>(
    initial?.estimatedExpenses ?? EMPTY_EXPENSES,
  );
  const [targetMargin, setTargetMargin] = useState(String(initial?.targetMargin ?? 0));
  const [recommendedMax, setRecommendedMax] = useState(initial?.recommendedMaxAcquisition ?? 0);
  const [buyerOverride, setBuyerOverride] = useState(initial?.buyerOverride ?? null);
  const [overrideAmount, setOverrideAmount] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [overriding, setOverriding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [overrideError, setOverrideError] = useState<string | null>(null);

  function addBidReference() {
    const amount = Number(newAmount);
    if (!newSource.trim() || !Number.isFinite(amount) || amount < 0) return;
    setBidReferences((current) => [
      ...current,
      { source: newSource.trim(), amount, loggedAt: new Date().toISOString() },
    ]);
    setNewSource('');
    setNewAmount('');
  }

  function removeBidReference(index: number) {
    setBidReferences((current) => current.filter((_, i) => i !== index));
  }

  async function handleSaveValuation() {
    setSaving(true);
    setError(null);
    try {
      const updated = await saveValuation(authFetch, submissionId, {
        bidReferences: bidReferences.map((b) => ({
          source: b.source,
          amount: b.amount,
          loggedAt: b.loggedAt,
        })),
        estimatedExpenses: expenses,
        targetMargin: Number(targetMargin) || 0,
      });
      setRecommendedMax(updated.recommendedMaxAcquisition);
      setBidReferences(updated.bidReferences);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to save the valuation.');
    } finally {
      setSaving(false);
    }
  }

  async function handleOverride() {
    setOverrideError(null);
    const amount = Number(overrideAmount);
    if (!Number.isFinite(amount) || amount < 0) {
      setOverrideError('Enter a valid override amount.');
      return;
    }
    if (!overrideReason.trim()) {
      setOverrideError('An override reason is required.');
      return;
    }
    setOverriding(true);
    try {
      const updated = await overrideValuation(authFetch, submissionId, {
        amount,
        reason: overrideReason.trim(),
      });
      setBuyerOverride(updated.buyerOverride);
      setOverrideAmount('');
      setOverrideReason('');
    } catch (err) {
      setOverrideError(err instanceof ApiError ? err.message : 'Unable to log the override.');
    } finally {
      setOverriding(false);
    }
  }

  const totalExpenses =
    expenses.transport + expenses.recon + expenses.arbitrationCondition + expenses.other;

  return (
    <div className="h-fit rounded-md border border-ink-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <p className="font-display text-sm font-bold text-navy-900">Valuation workspace</p>
        <span className="inline-flex items-center gap-1 rounded-full bg-ink-100 px-2 py-0.5 text-[11px] font-semibold text-ink-600">
          🔒 Internal
        </span>
      </div>

      <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-ink-500">
        Disposition / bid references
      </p>
      <div className="mt-2 space-y-1">
        {bidReferences.map((bid, index) => (
          <div key={`${bid.source}-${index}`} className="flex items-center justify-between text-sm">
            <span className="text-ink-700">{bid.source}</span>
            <span className="flex items-center gap-2">
              <span className="font-semibold text-ink-900">${bid.amount.toLocaleString()}</span>
              <span className="text-xs text-ink-500">{formatRelativeAge(bid.loggedAt)} ago</span>
              <button
                type="button"
                onClick={() => removeBidReference(index)}
                className="text-xs text-danger hover:underline"
              >
                Remove
              </button>
            </span>
          </div>
        ))}
        {bidReferences.length === 0 && (
          <p className="text-sm text-ink-500">No bid references yet.</p>
        )}
      </div>
      <div className="mt-2 flex gap-2">
        <input
          placeholder="Source"
          value={newSource}
          onChange={(event) => setNewSource(event.target.value)}
          className="min-w-0 flex-1 rounded-md border-[1.5px] border-ink-300 px-2 py-1.5 text-sm outline-none focus:border-blue-500"
        />
        <input
          placeholder="$"
          type="number"
          value={newAmount}
          onChange={(event) => setNewAmount(event.target.value)}
          className="w-24 rounded-md border-[1.5px] border-ink-300 px-2 py-1.5 text-sm outline-none focus:border-blue-500"
        />
        <button
          type="button"
          onClick={addBidReference}
          className="rounded-md border-[1.5px] border-navy-900 px-3 py-1.5 text-sm font-semibold text-navy-900 hover:bg-ink-50"
        >
          + Add
        </button>
      </div>

      <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-ink-500">
        Estimated expenses
      </p>
      <div className="mt-2 grid grid-cols-2 gap-3">
        <ExpenseField
          label="Transport"
          value={expenses.transport}
          onChange={(v) => setExpenses((c) => ({ ...c, transport: v }))}
        />
        <ExpenseField
          label="Recon"
          value={expenses.recon}
          onChange={(v) => setExpenses((c) => ({ ...c, recon: v }))}
        />
        <ExpenseField
          label="Arbitration / condition"
          value={expenses.arbitrationCondition}
          onChange={(v) => setExpenses((c) => ({ ...c, arbitrationCondition: v }))}
        />
        <ExpenseField
          label="Other"
          value={expenses.other}
          onChange={(v) => setExpenses((c) => ({ ...c, other: v }))}
        />
      </div>

      <label className="mt-4 block">
        <span className="text-xs font-semibold uppercase tracking-wide text-ink-500">
          Target margin
        </span>
        <input
          type="number"
          value={targetMargin}
          onChange={(event) => setTargetMargin(event.target.value)}
          className="mt-1 w-full rounded-md border-[1.5px] border-ink-300 px-2 py-1.5 text-sm outline-none focus:border-blue-500"
        />
      </label>

      {error && (
        <p role="alert" className="mt-2 text-sm font-medium text-danger">
          {error}
        </p>
      )}
      <button
        type="button"
        disabled={saving}
        onClick={() => {
          void handleSaveValuation();
        }}
        className="mt-3 w-full rounded-md bg-navy-900 py-2 text-sm font-semibold text-white hover:bg-navy-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save valuation'}
      </button>

      <div className="mt-4 rounded-md bg-gradient-to-br from-navy-700 to-navy-900 p-4 text-white">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-100">
          Recommended max acquisition
        </p>
        <p className="mt-1 font-display text-2xl font-extrabold italic">
          ${recommendedMax.toLocaleString()}
        </p>
        <p className="mt-1 text-xs text-blue-100">
          {bidReferences.length > 0
            ? `$${Math.max(...bidReferences.map((b) => b.amount)).toLocaleString()}`
            : '$0'}{' '}
          best bid − ${totalExpenses.toLocaleString()} expenses − $
          {(Number(targetMargin) || 0).toLocaleString()} margin
        </p>
      </div>

      <label className="mt-4 block">
        <span className="text-xs font-semibold uppercase tracking-wide text-ink-500">
          Buyer override
        </span>
        <input
          type="number"
          placeholder={buyerOverride ? `Current: $${buyerOverride.amount.toLocaleString()}` : '$'}
          value={overrideAmount}
          onChange={(event) => setOverrideAmount(event.target.value)}
          className="mt-1 w-full rounded-md border-[1.5px] border-ink-300 px-2 py-1.5 text-sm outline-none focus:border-blue-500"
        />
      </label>
      <label className="mt-2 block">
        <span className="text-xs font-semibold uppercase tracking-wide text-ink-500">
          Override reason *
        </span>
        <textarea
          rows={2}
          value={overrideReason}
          onChange={(event) => setOverrideReason(event.target.value)}
          className="mt-1 w-full rounded-md border-[1.5px] border-ink-300 px-2 py-1.5 text-sm outline-none focus:border-blue-500"
        />
      </label>
      <p className="mt-1 text-xs text-ink-500">
        Logged to the audit trail with your name and time.
      </p>
      {overrideError && (
        <p role="alert" className="mt-1 text-sm font-medium text-danger">
          {overrideError}
        </p>
      )}
      <button
        type="button"
        disabled={overriding}
        onClick={() => {
          void handleOverride();
        }}
        className="mt-2 w-full rounded-md border-[1.5px] border-navy-900 py-2 text-sm font-semibold text-navy-900 hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {overriding ? 'Logging…' : 'Log override'}
      </button>
      {buyerOverride && (
        <p className="mt-2 text-xs text-ink-500">
          Last override: ${buyerOverride.amount.toLocaleString()} by{' '}
          {formatRelativeAge(buyerOverride.loggedAt)} ago — &ldquo;{buyerOverride.reason}&rdquo;
        </p>
      )}
    </div>
  );
}

function ExpenseField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs text-ink-500">{label}</span>
      <input
        type="number"
        value={value}
        onChange={(event) => onChange(Number(event.target.value) || 0)}
        className="mt-1 w-full rounded-md border-[1.5px] border-ink-300 px-2 py-1.5 text-sm outline-none focus:border-blue-500"
      />
    </label>
  );
}
