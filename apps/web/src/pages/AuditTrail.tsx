import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ApiError } from '../lib/api';
import { useAuth } from '../lib/auth-context';
import { getAuditTrail, type AuditLogEntry } from '../lib/offers-api';

const ACTION_BADGES: Record<string, string> = {
  submitted: 'bg-blue-500/10 text-blue-600',
  status_changed: 'bg-ink-100 text-ink-600',
  valuation_entered: 'bg-blue-500/10 text-blue-600',
  limit_overridden: 'bg-warning-bg text-warning',
  offer_sent: 'bg-navy-900 text-white',
  offer_countered: 'bg-warning-bg text-warning',
  offer_accepted: 'bg-success-bg text-success',
  offer_declined: 'bg-danger-bg text-danger',
};

const ACTION_LABELS: Record<string, string> = {
  submitted: 'Submitted',
  limit_overridden: 'Limit overridden',
  offer_sent: 'Offer sent',
  offer_countered: 'Offer countered',
  offer_accepted: 'Offer accepted',
  offer_declined: 'Offer declined',
};

function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action;
}

function actorLabel(actor: AuditLogEntry['actor']): string {
  if (!actor) return 'Unknown';
  const roleLabel =
    actor.role === 'trade_desk' ? 'Trade Desk' : actor.role === 'seller' ? 'Seller' : 'Admin';
  return `${actor.email} (${roleLabel})`;
}

export default function AuditTrail() {
  const { id } = useParams<{ id: string }>();
  const { authFetch } = useAuth();
  const [entries, setEntries] = useState<AuditLogEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    getAuditTrail(authFetch, id)
      .then((result) => {
        if (!cancelled) setEntries(result);
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setError(err instanceof ApiError ? err.message : 'Unable to load the audit trail.');
      });
    return () => {
      cancelled = true;
    };
  }, [id, authFetch]);

  return (
    <main className="mx-auto max-w-4xl p-8">
      <Link
        to={`/desk/submissions/${id}`}
        className="text-sm font-semibold text-blue-500 hover:underline"
      >
        ← Back to submission
      </Link>

      <div className="mt-2 flex items-center gap-2">
        <h1 className="font-display text-2xl font-bold text-navy-900">Audit trail</h1>
        <span className="inline-flex items-center gap-1 rounded-full bg-ink-100 px-2 py-0.5 text-[11px] font-semibold text-ink-600">
          🔒 Internal · retained for reference
        </span>
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm font-medium text-danger">
          {error}
        </p>
      )}
      {!error && !entries && <p className="mt-4 text-sm text-ink-500">Loading…</p>}
      {entries && entries.length === 0 && (
        <p className="mt-4 text-sm text-ink-500">No activity recorded yet.</p>
      )}

      {entries && entries.length > 0 && (
        <div className="mt-4 overflow-x-auto rounded-md border border-ink-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-ink-50 text-xs font-semibold uppercase tracking-wide text-ink-500">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Actor</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Detail</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry._id} className="border-t border-ink-200">
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-ink-500">
                    {new Date(entry.createdAt).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                      second: '2-digit',
                      hour12: true,
                    })}
                  </td>
                  <td className="px-4 py-3 text-ink-700">{actorLabel(entry.actor)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                        ACTION_BADGES[entry.action] ?? 'bg-ink-100 text-ink-600'
                      }`}
                    >
                      {actionLabel(entry.action)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ink-700">{entry.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
