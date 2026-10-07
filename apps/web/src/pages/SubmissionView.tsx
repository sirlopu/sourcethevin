import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import MessageThread from '../components/MessageThread';
import { ApiError } from '../lib/api';
import { useAuth } from '../lib/auth-context';
import {
  acceptOffer,
  counterOffer,
  declineOffer,
  getAuditTrail,
  getLatestOffer,
  type AuditLogEntry,
  type OfferRecord,
} from '../lib/offers-api';
import { getSubmission, type SubmissionRecord } from '../lib/wizard-api';

function vehicleLabel(submission: SubmissionRecord): string {
  return (
    [
      submission.vehicle.year,
      submission.vehicle.make,
      submission.vehicle.model,
      submission.vehicle.trim,
    ]
      .filter(Boolean)
      .join(' ') || 'Vehicle'
  );
}

export default function SubmissionView() {
  const { id } = useParams<{ id: string }>();
  const { authFetch } = useAuth();
  const [submission, setSubmission] = useState<SubmissionRecord | null>(null);
  const [offer, setOffer] = useState<OfferRecord | null>(null);
  const [auditEntries, setAuditEntries] = useState<AuditLogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!id) return;
    try {
      const [nextSubmission, nextOffer, nextAudit] = await Promise.all([
        getSubmission(authFetch, id),
        getLatestOffer(authFetch, id),
        getAuditTrail(authFetch, id),
      ]);
      setSubmission(nextSubmission);
      setOffer(nextOffer);
      setAuditEntries(nextAudit);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load this trade-in.');
    }
  }, [id, authFetch]);

  useEffect(() => {
    // setState here happens after an await inside refresh(), not synchronously in the effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  if (error) {
    return (
      <main className="mx-auto max-w-lg p-8">
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      </main>
    );
  }
  if (!submission || !id) {
    return (
      <main className="mx-auto max-w-lg p-8">
        <p className="text-sm text-ink-500">Loading…</p>
      </main>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-50 p-6">
      <div className="w-full max-w-lg">
        <Link
          to="/dashboard"
          className="mb-4 block text-sm font-semibold text-blue-500 hover:underline"
        >
          ← Back to dashboard
        </Link>

        {submission.status === 'accepted' && (
          <AcceptedTimeline submission={submission} auditEntries={auditEntries} />
        )}

        {submission.status === 'declined' && <DeclinedCard submission={submission} />}

        {submission.status !== 'accepted' &&
          submission.status !== 'declined' &&
          offer &&
          offer.status === 'pending' &&
          offer.createdByRole === 'trade_desk' && (
            <OfferReviewCard
              submission={submission}
              offer={offer}
              authFetch={authFetch}
              onChange={refresh}
            />
          )}

        {submission.status !== 'accepted' &&
          submission.status !== 'declined' &&
          offer &&
          offer.status === 'pending' &&
          offer.createdByRole === 'seller' && (
            <WaitingCard message="We've received your counter-offer and are reviewing it." />
          )}

        {submission.status !== 'accepted' && submission.status !== 'declined' && !offer && (
          <WaitingCard message="Your trade-in is under review." />
        )}

        <div className="mt-6">
          <MessageThread submissionId={id} currentUserRole="seller" />
        </div>
      </div>
    </div>
  );
}

function WaitingCard({ message }: { message: string }) {
  return (
    <div className="rounded-xl bg-white p-8 text-center shadow-[0_12px_32px_rgba(10,31,82,.14)]">
      <p className="text-sm text-ink-700">{message}</p>
    </div>
  );
}

function DeclinedCard({ submission }: { submission: SubmissionRecord }) {
  return (
    <div className="rounded-xl bg-white p-8 text-center shadow-[0_12px_32px_rgba(10,31,82,.14)]">
      <p className="font-display text-xl font-bold text-navy-900">Trade declined</p>
      <p className="mt-2 text-sm text-ink-500">
        This trade for {vehicleLabel(submission)} has been declined. You can start a new trade-in
        any time.
      </p>
      <Link
        to="/dashboard"
        className="mt-4 inline-block rounded-md bg-navy-900 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-800"
      >
        Back to dashboard
      </Link>
      <VehicleDetailsCard submission={submission} />
    </div>
  );
}

function VehicleDetailsCard({ submission }: { submission: SubmissionRecord }) {
  return (
    <div className="mt-6 rounded-md border border-ink-200 p-5 text-left">
      <p className="font-display text-sm font-bold text-navy-900">Vehicle details</p>
      <div className="mt-3 space-y-1">
        <Row label="VIN" value={submission.vin ?? '—'} />
        <Row label="Vehicle" value={vehicleLabel(submission)} />
        <Row label="Mileage" value={submission.vehicle.mileage?.toLocaleString() ?? '—'} />
      </div>
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

function OfferReviewCard({
  submission,
  offer,
  authFetch,
  onChange,
}: {
  submission: SubmissionRecord;
  offer: OfferRecord;
  authFetch: ReturnType<typeof useAuth>['authFetch'];
  onChange: () => Promise<void>;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [counterOpen, setCounterOpen] = useState(false);
  const [counterAmount, setCounterAmount] = useState('');
  const [counterNotes, setCounterNotes] = useState('');
  const [clock, setClock] = useState(() => Date.now());
  const expiresAt = new Date(offer.expiresAt).getTime();
  const expired = clock >= expiresAt || Date.now() >= expiresAt;

  useEffect(() => {
    const delay = expiresAt - Date.now();
    if (delay <= 0) return;
    const timeout = window.setTimeout(() => setClock(Date.now()), delay);
    return () => window.clearTimeout(timeout);
  }, [expiresAt]);

  async function handleAccept() {
    setSubmitting(true);
    setError(null);
    try {
      await acceptOffer(authFetch, offer._id);
      await onChange();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to accept the offer.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDecline() {
    setSubmitting(true);
    setError(null);
    try {
      await declineOffer(authFetch, offer._id);
      await onChange();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to decline the offer.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCounter() {
    setError(null);
    const amount = Number(counterAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Enter a valid counter amount.');
      return;
    }
    setSubmitting(true);
    try {
      await counterOffer(authFetch, offer._id, { amount, notes: counterNotes || undefined });
      await onChange();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to send your counter-offer.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-xl bg-navy-900 text-white shadow-[0_12px_32px_rgba(10,31,82,.14)]">
      <div className="p-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-300">
          Offer received
        </p>
        <span
          role="status"
          aria-live="polite"
          className={`mt-1 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${expired ? 'bg-red-200 text-red-950' : 'bg-white/10 text-blue-100'}`}
        >
          {expired ? '!' : '●'} {expired ? 'Offer expired' : 'Awaiting your response'}
        </span>

        <p className="mt-4 font-mono text-xs text-blue-100">{submission.referenceId}</p>
        <p className="font-display text-lg font-bold">{vehicleLabel(submission)}</p>

        <div className="mt-4 rounded-md bg-gradient-to-br from-blue-400 to-blue-600 p-5 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-100">Offer</p>
          <p className="mt-1 font-display text-3xl font-extrabold italic">
            ${offer.amount.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-blue-100">
            Expires {new Date(offer.expiresAt).toLocaleString()} · v{offer.version}
          </p>
        </div>

        {offer.terms && (
          <p className="mt-4 rounded-md bg-white/10 p-3 text-xs text-blue-100">
            <span className="font-semibold text-white">Terms: </span>
            {offer.terms}
          </p>
        )}

        {error && (
          <p role="alert" className="mt-4 text-sm font-medium text-red-300">
            {error}
          </p>
        )}

        {expired ? (
          <p className="mt-5 rounded-md border border-red-300/40 bg-red-950/40 p-3 text-center text-sm font-semibold text-red-100">
            This offer has expired. Message the Trade Desk to ask for a new offer.
          </p>
        ) : (
          <>
            <button
              type="button"
              disabled={submitting}
              onClick={() => {
                void handleAccept();
              }}
              className="mt-5 w-full rounded-md bg-success py-3 font-display font-semibold text-white hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Accept offer
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => {
                void handleDecline();
              }}
              className="mt-2 w-full rounded-md border-[1.5px] border-red-300 py-3 font-display font-semibold text-red-300 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Decline
            </button>
            <button
              type="button"
              onClick={() => setCounterOpen((open) => !open)}
              className="mt-2 w-full text-center text-sm font-semibold text-blue-100 hover:underline"
            >
              {counterOpen ? 'Cancel counter-offer' : 'Propose a different amount'}
            </button>

            {counterOpen && (
              <div className="mt-3 space-y-2 rounded-md bg-white/10 p-3">
                <label className="block">
                  <span className="text-xs text-blue-100">Your counter amount</span>
                  <input
                    type="number"
                    value={counterAmount}
                    onChange={(event) => setCounterAmount(event.target.value)}
                    className="mt-1 w-full rounded-md border-[1.5px] border-transparent bg-white px-2 py-1.5 text-sm text-navy-900 outline-none focus:border-blue-400"
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-blue-100">Note (optional)</span>
                  <textarea
                    rows={2}
                    value={counterNotes}
                    onChange={(event) => setCounterNotes(event.target.value)}
                    className="mt-1 w-full rounded-md border-[1.5px] border-transparent bg-white px-2 py-1.5 text-sm text-navy-900 outline-none focus:border-blue-400"
                  />
                </label>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => {
                    void handleCounter();
                  }}
                  className="w-full rounded-md bg-white py-2 text-sm font-semibold text-navy-900 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? 'Sending…' : 'Send counter-offer'}
                </button>
              </div>
            )}
          </>
        )}

        {!expired && (
          <p className="mt-4 text-center text-xs text-blue-100">
            Accepting records your name, the date &amp; time, and offer version.
          </p>
        )}
      </div>
    </div>
  );
}

function AcceptedTimeline({
  submission,
  auditEntries,
}: {
  submission: SubmissionRecord;
  auditEntries: AuditLogEntry[];
}) {
  return (
    <div className="rounded-xl bg-white p-8 text-center shadow-[0_12px_32px_rgba(10,31,82,.14)]">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success-bg text-2xl text-success">
        ✓
      </div>
      <h1 className="mt-4 font-display text-2xl font-bold italic text-navy-900">Offer accepted</h1>
      <p className="text-sm text-ink-500">{vehicleLabel(submission)}</p>

      <div className="mt-6 space-y-4 text-left">
        {auditEntries.map((entry, index) => (
          <div key={entry._id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={`h-2.5 w-2.5 rounded-full ${index === 0 ? 'bg-success' : 'bg-navy-900'}`}
              />
              {index < auditEntries.length - 1 && (
                <span className="mt-1 h-full w-px flex-1 bg-ink-200" />
              )}
            </div>
            <div className="pb-4">
              <p className="text-sm font-semibold text-ink-900">{timelineLabel(entry)}</p>
              <p className="text-xs text-ink-500">
                {new Date(entry.createdAt).toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-4 rounded-md bg-ink-50 p-3 text-left text-xs text-ink-500">
        Next: we&rsquo;ll contact you to arrange drop-off and payoff.
      </p>

      <VehicleDetailsCard submission={submission} />
    </div>
  );
}

function timelineLabel(entry: AuditLogEntry): string {
  switch (entry.action) {
    case 'offer_accepted':
      return `Accepted by ${entry.actor?.email ?? 'you'}`;
    case 'offer_sent':
      return `Offer sent · ${entry.detail}`;
    case 'offer_countered':
      return 'Counter-offer sent';
    case 'submitted':
      return 'Submitted';
    default:
      return entry.detail;
  }
}
