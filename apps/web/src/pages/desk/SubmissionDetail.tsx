import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import MessageThread from '../../components/MessageThread';
import { ApiError } from '../../lib/api';
import { useAuth } from '../../lib/auth-context';
import {
  appendInternalNote,
  declineSubmission,
  getSubmissionDetail,
  overrideValuation,
  saveValuation,
  type BidReference,
  type EstimatedExpenses,
  type SubmissionListItem,
} from '../../lib/desk-api';
import {
  acceptOffer,
  createOffer,
  declineOffer,
  getLatestOffer,
  type OfferRecord,
} from '../../lib/offers-api';
import { formatRelativeAge } from '../../lib/relative-time';
import { statusBadge } from '../../lib/submission-status';
import { photoSlotLabel } from '@sourcethevin/shared';
import type { SubmissionPhoto } from '../../lib/wizard-api';

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
  const [enlargedPhoto, setEnlargedPhoto] = useState<SubmissionPhoto | null>(null);

  useEffect(() => {
    if (!enlargedPhoto) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setEnlargedPhoto(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enlargedPhoto]);

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
      <div className="flex items-center justify-between">
        <Link to="/desk/queue" className="text-sm font-semibold text-blue-500 hover:underline">
          ← Back to queue
        </Link>
        <Link
          to={`/submissions/${id}/audit`}
          className="text-sm font-semibold text-blue-500 hover:underline"
        >
          View audit trail →
        </Link>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <p className="font-mono text-xs text-ink-500">{submission.referenceId}</p>
        {(() => {
          const badge = statusBadge(submission.status);
          return (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold ${badge.className}`}
            >
              ● {badge.label}
            </span>
          );
        })()}
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
              role="button"
              tabIndex={0}
              onClick={() => setEnlargedPhoto(photo)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') setEnlargedPhoto(photo);
              }}
              className="h-20 w-20 flex-shrink-0 cursor-pointer rounded-md border border-ink-200 object-cover hover:opacity-80"
            />
          ))}
        </div>
      )}

      {enlargedPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-8"
          onClick={() => setEnlargedPhoto(null)}
        >
          <button
            type="button"
            onClick={() => setEnlargedPhoto(null)}
            aria-label="Close"
            className="absolute right-4 top-4 text-3xl font-bold text-white hover:text-ink-200"
          >
            ×
          </button>
          <figure className="flex max-h-full max-w-full flex-col items-center gap-2">
            <img
              src={enlargedPhoto.url}
              alt={enlargedPhoto.slot}
              onClick={(event) => event.stopPropagation()}
              className="max-h-[90vh] max-w-[90vw] rounded-md object-contain"
            />
            <figcaption className="text-sm font-medium text-white">
              {photoSlotLabel(enlargedPhoto.slot)}
            </figcaption>
          </figure>
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
          <div className="space-y-6">
            <ValuationWorkspacePanel
              submissionId={id}
              authFetch={authFetch}
              initial={submission.valuation}
            />
            <OfferPanel
              submissionId={id}
              authFetch={authFetch}
              submissionStatus={submission.status}
              onStatusChange={(status) =>
                setSubmission((prev) => (prev ? { ...prev, status } : prev))
              }
            />
          </div>
        )}
      </div>

      <div className="mt-6">
        <MessageThread submissionId={id} currentUserRole="trade_desk" />
      </div>
    </main>
  );
}

function defaultExpiryLocal(): string {
  const d = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function OfferPanel({
  submissionId,
  authFetch,
  submissionStatus,
  onStatusChange,
}: {
  submissionId: string;
  authFetch: ReturnType<typeof useAuth>['authFetch'];
  submissionStatus: string;
  onStatusChange: (status: SubmissionListItem['status']) => void;
}) {
  const [latestOffer, setLatestOffer] = useState<OfferRecord | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [amount, setAmount] = useState('');
  const [expiresAt, setExpiresAt] = useState(defaultExpiryLocal());
  const [terms, setTerms] = useState('');
  const [sending, setSending] = useState(false);
  const [responding, setResponding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clock, setClock] = useState(() => Date.now());
  const offerExpiresAt = latestOffer ? new Date(latestOffer.expiresAt).getTime() : null;
  const offerExpired =
    latestOffer?.status === 'pending' && offerExpiresAt !== null && clock >= offerExpiresAt;

  useEffect(() => {
    let cancelled = false;
    getLatestOffer(authFetch, submissionId)
      .then((offer) => {
        if (!cancelled) setLatestOffer(offer);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [authFetch, submissionId]);

  useEffect(() => {
    if (latestOffer?.status !== 'pending') return;
    // Fire immediately (next tick) if already past expiry so `clock` catches up.
    const delay = Math.max(new Date(latestOffer.expiresAt).getTime() - Date.now(), 0);
    const timeout = window.setTimeout(() => setClock(Date.now()), delay);
    return () => window.clearTimeout(timeout);
  }, [latestOffer?._id, latestOffer?.status, latestOffer?.expiresAt]);

  const resolved = submissionStatus === 'accepted' || submissionStatus === 'declined';

  async function handleAcceptCounter() {
    if (!latestOffer) return;
    setResponding(true);
    setError(null);
    try {
      const offer = await acceptOffer(authFetch, latestOffer._id);
      setLatestOffer(offer);
      onStatusChange('accepted');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to accept the offer.');
    } finally {
      setResponding(false);
    }
  }

  async function handleDeclineCounter() {
    if (!latestOffer) return;
    setResponding(true);
    setError(null);
    try {
      const offer = await declineOffer(authFetch, latestOffer._id);
      setLatestOffer(offer);
      onStatusChange('submitted');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to decline the offer.');
    } finally {
      setResponding(false);
    }
  }

  async function handleEndNegotiation() {
    if (!window.confirm('End this trade? No further offers or counters will be possible.')) {
      return;
    }
    setResponding(true);
    setError(null);
    try {
      const updated = await declineSubmission(authFetch, submissionId);
      onStatusChange(updated.status);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to end this trade.');
    } finally {
      setResponding(false);
    }
  }

  async function handleSend() {
    setError(null);
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError('Enter a valid offer amount.');
      return;
    }
    if (!expiresAt) {
      setError('Set an expiration date/time.');
      return;
    }
    setSending(true);
    try {
      const offer = await createOffer(authFetch, submissionId, {
        amount: parsedAmount,
        expiresAt: new Date(expiresAt).toISOString(),
        terms: terms || undefined,
      });
      setLatestOffer(offer);
      setAmount('');
      setExpiresAt(defaultExpiryLocal());
      setTerms('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to send the offer.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="rounded-md border border-ink-200 bg-white p-5">
      <p className="font-display text-sm font-bold text-navy-900">Offer</p>

      {loaded && latestOffer && (
        <div className="mt-3 rounded-md bg-ink-50 p-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-ink-900">
              v{latestOffer.version} · ${latestOffer.amount.toLocaleString()}
            </span>
            <span
              role="status"
              aria-live="polite"
              className={
                offerExpired
                  ? 'inline-flex rounded-full bg-danger-bg px-2 py-0.5 text-xs font-semibold uppercase text-danger'
                  : 'text-xs font-semibold uppercase text-ink-500'
              }
            >
              {offerExpired ? 'expired' : latestOffer.status}
            </span>
          </div>
          {latestOffer.createdByRole === 'seller' && latestOffer.status === 'pending' && (
            <>
              <p className="mt-1 text-xs font-semibold text-warning">
                Seller countered{latestOffer.notes ? `: "${latestOffer.notes}"` : ''}
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  disabled={responding}
                  onClick={() => {
                    void handleAcceptCounter();
                  }}
                  className="flex-1 rounded-md bg-success py-2 text-sm font-display font-semibold text-white hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Accept counter
                </button>
                <button
                  type="button"
                  disabled={responding}
                  onClick={() => {
                    void handleDeclineCounter();
                  }}
                  className="flex-1 rounded-md border-[1.5px] border-red-300 py-2 text-sm font-display font-semibold text-red-300 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Decline
                </button>
              </div>
            </>
          )}
          <p className="mt-1 text-xs text-ink-500">
            Expires {new Date(latestOffer.expiresAt).toLocaleString()}
          </p>
        </div>
      )}
      {loaded && !latestOffer && <p className="mt-2 text-sm text-ink-500">No offer sent yet.</p>}

      {!resolved && (
        <div className="mt-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
            {latestOffer ? 'Send a new offer' : 'New purchase offer'}
          </p>
          <label className="block">
            <span className="text-xs text-ink-500">Offer amount</span>
            <input
              type="number"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="mt-1 w-full rounded-md border-[1.5px] border-ink-300 px-2 py-1.5 text-sm outline-none focus:border-blue-500"
            />
          </label>
          <label className="block">
            <span className="text-xs text-ink-500">Expires</span>
            <input
              type="datetime-local"
              value={expiresAt}
              onChange={(event) => setExpiresAt(event.target.value)}
              className="mt-1 w-full rounded-md border-[1.5px] border-ink-300 px-2 py-1.5 text-sm outline-none focus:border-blue-500"
            />
          </label>
          <label className="block">
            <span className="text-xs text-ink-500">
              Terms / notes (optional, visible to seller)
            </span>
            <textarea
              rows={2}
              value={terms}
              onChange={(event) => setTerms(event.target.value)}
              className="mt-1 w-full rounded-md border-[1.5px] border-ink-300 px-2 py-1.5 text-sm outline-none focus:border-blue-500"
            />
          </label>
          {error && (
            <p role="alert" className="text-sm font-medium text-danger">
              {error}
            </p>
          )}
          <button
            type="button"
            disabled={sending}
            onClick={() => {
              void handleSend();
            }}
            className="w-full rounded-md bg-success py-2 text-sm font-semibold text-white hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sending ? 'Sending…' : 'Send offer to seller'}
          </button>
          <button
            type="button"
            disabled={responding}
            onClick={() => {
              void handleEndNegotiation();
            }}
            className="w-full text-center text-xs font-semibold text-danger underline decoration-dotted hover:text-danger disabled:cursor-not-allowed disabled:opacity-50"
          >
            End negotiation
          </button>
        </div>
      )}
    </div>
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
  const [notes, setNotes] = useState('');
  const [noteHistory, setNoteHistory] = useState(valuation?.internalNoteHistory ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const updated = await appendInternalNote(authFetch, submissionId, notes);
      setNoteHistory(updated.internalNoteHistory);
      setNotes('');
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
        aria-label="Internal notes"
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
        disabled={saving || !notes.trim()}
        onClick={() => {
          void handleSave();
        }}
        className="mt-2 rounded-md border-[1.5px] border-navy-900 px-3 py-1.5 text-sm font-semibold text-navy-900 hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save notes'}
      </button>
      <div role="group" aria-label="Saved notes" className="mt-3 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Saved notes</p>
        {noteHistory.length === 0 ? (
          <p className="rounded-md bg-ink-50 p-3 text-sm text-ink-500">No saved notes.</p>
        ) : (
          [...noteHistory]
            .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
            .map((note, index) => (
              <article key={`${note.createdAt}-${index}`} className="rounded-md bg-ink-50 p-3">
                <time dateTime={note.createdAt} className="text-xs font-semibold text-ink-700">
                  {new Date(note.createdAt).toLocaleString()}
                </time>
                <p className="mt-1 whitespace-pre-wrap text-sm text-ink-900">{note.text}</p>
              </article>
            ))
        )}
      </div>
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
