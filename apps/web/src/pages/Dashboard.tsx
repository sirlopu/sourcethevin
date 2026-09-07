import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { RoleShell } from '../components/RoleShell';
import { ApiError } from '../lib/api';
import { useAuth } from '../lib/auth-context';
import { listSubmissions, type SubmissionListItem } from '../lib/desk-api';
import { statusBadge } from '../lib/submission-status';
import { useStartSubmission } from '../lib/useStartSubmission';

export default function Dashboard() {
  const { authFetch } = useAuth();
  const startSubmission = useStartSubmission();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionListItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    listSubmissions(authFetch, { limit: 10 })
      .then((response) => {
        if (!cancelled) setSubmissions(response.items);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [authFetch]);

  async function handleStart() {
    setStarting(true);
    setError(null);
    try {
      await startSubmission();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
      setStarting(false);
    }
  }

  return (
    <RoleShell title="Seller dashboard">
      <div className="max-w-sm rounded-md bg-gradient-to-br from-blue-400 to-blue-600 p-5 text-white shadow-[0_4px_14px_rgba(10,75,168,.25)]">
        <p className="text-xs font-semibold text-blue-100">Start a new</p>
        <p className="font-display text-xl font-bold">Trade-in submission</p>
        <button
          type="button"
          disabled={starting}
          onClick={() => {
            void handleStart();
          }}
          className="mt-4 w-full rounded-md bg-white py-2.5 font-display font-semibold text-navy-900 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {starting ? 'Starting…' : 'Enter VIN →'}
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-3 text-sm font-medium text-danger">
          {error}
        </p>
      )}

      {submissions.length > 0 && (
        <div className="mt-8 max-w-lg">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">
            Recent submissions
          </p>
          <div className="divide-y divide-ink-200 rounded-md border border-ink-200 bg-white">
            {submissions.map((item) => {
              const vehicle =
                [item.vehicle.year, item.vehicle.make, item.vehicle.model]
                  .filter(Boolean)
                  .join(' ') || 'Untitled trade-in';
              const badge = statusBadge(item.status);
              const isDraft = item.status === 'new';
              return (
                <Link
                  key={item._id}
                  to={
                    isDraft ? `/wizard/${item._id}/${item.currentStep}` : `/submissions/${item._id}`
                  }
                  className="flex items-center justify-between gap-3 p-3 text-sm hover:bg-ink-50"
                >
                  <div>
                    <p className="font-semibold text-ink-900">{vehicle}</p>
                    <p className="font-mono text-xs text-ink-500">{item.referenceId}</p>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${badge.className}`}
                  >
                    ● {badge.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </RoleShell>
  );
}
