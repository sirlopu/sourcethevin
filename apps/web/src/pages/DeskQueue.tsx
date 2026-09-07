import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { RoleShell } from '../components/RoleShell';
import { ApiError } from '../lib/api';
import { useAuth } from '../lib/auth-context';
import { listSubmissions, type SubmissionListItem } from '../lib/desk-api';
import { formatRelativeAge } from '../lib/relative-time';
import { statusBadge } from '../lib/submission-status';

const DATE_RANGE_OPTIONS = [
  { value: '1', label: 'Last 24 hours' },
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '', label: 'All time' },
] as const;

function vehicleLabel(item: SubmissionListItem): string {
  return (
    [item.vehicle.year, item.vehicle.make, item.vehicle.model, item.vehicle.trim]
      .filter(Boolean)
      .join(' ') || 'Vehicle'
  );
}

function sellerLabel(item: SubmissionListItem): string {
  if (!item.seller) return '—';
  return [item.seller.dealershipName, item.seller.email].filter(Boolean).join(' · ');
}

export default function DeskQueue() {
  const { authFetch } = useAuth();
  const [items, setItems] = useState<SubmissionListItem[]>([]);
  const [newCount, setNewCount] = useState(0);
  const [search, setSearch] = useState('');
  const [dateRangeDays, setDateRangeDays] = useState<string>('7');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const dateFrom = dateRangeDays
      ? new Date(Date.now() - Number(dateRangeDays) * 24 * 60 * 60 * 1000).toISOString()
      : undefined;
    Promise.all([
      listSubmissions(authFetch, { dateFrom, limit: 50 }),
      listSubmissions(authFetch, { status: 'submitted', limit: 1 }),
    ])
      .then(([response, newResponse]) => {
        if (cancelled) return;
        setItems(response.items);
        setNewCount(newResponse.total);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : 'Unable to load the queue.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [authFetch, dateRangeDays]);

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return items;
    return items.filter((item) => {
      const haystack = [
        item.referenceId,
        item.vin,
        vehicleLabel(item),
        item.seller?.email,
        item.seller?.dealershipName,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [items, search]);

  return (
    <RoleShell title="Submission queue">
      <div className="mb-4 flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-2.5 py-1 text-xs font-semibold text-blue-600">
          ● {newCount} new
        </span>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <input
          type="search"
          placeholder="Search VIN, seller, vehicle..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="min-w-[220px] flex-1 rounded-md border-[1.5px] border-ink-300 bg-white px-3 py-2 text-sm text-ink-900 outline-none focus:border-blue-500 focus:ring-[3px] focus:ring-blue-500/15"
        />
        <select
          value={dateRangeDays}
          onChange={(event) => setDateRangeDays(event.target.value)}
          className="rounded-md border-[1.5px] border-ink-300 bg-white px-3 py-2 text-sm text-ink-900 outline-none focus:border-blue-500 focus:ring-[3px] focus:ring-blue-500/15"
        >
          {DATE_RANGE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <p role="alert" className="mb-4 text-sm font-medium text-danger">
          {error}
        </p>
      )}
      {loading && <p className="text-sm text-ink-500">Loading…</p>}

      {!loading && !error && filteredItems.length === 0 && (
        <p className="text-sm text-ink-500">No submissions match these filters.</p>
      )}

      {!loading && filteredItems.length > 0 && (
        <>
          {/* Table — desktop */}
          <div className="hidden overflow-x-auto rounded-md border border-ink-200 md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-ink-50 text-xs font-semibold uppercase tracking-wide text-ink-500">
                <tr>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Vehicle</th>
                  <th className="px-4 py-3">Miles</th>
                  <th className="px-4 py-3">Seller</th>
                  <th className="px-4 py-3">Age</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr key={item._id} className="border-t border-ink-200 hover:bg-ink-50">
                    <td className="px-4 py-3">
                      <Link
                        to={`/desk/submissions/${item._id}`}
                        className="font-mono text-xs font-semibold text-blue-600 hover:underline"
                      >
                        {item.referenceId}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-ink-900">{vehicleLabel(item)}</p>
                      <p className="font-mono text-xs text-ink-500">
                        …{(item.vin ?? '').slice(-6)}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-ink-700">
                      {item.vehicle.mileage?.toLocaleString() ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-ink-700">{sellerLabel(item)}</td>
                    <td className="px-4 py-3 text-ink-500">
                      {formatRelativeAge(item.submittedAt ?? item.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={item.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cards — small screens */}
          <div className="space-y-3 md:hidden">
            {filteredItems.map((item) => (
              <Link
                key={item._id}
                to={`/desk/submissions/${item._id}`}
                className="block rounded-md border border-ink-200 p-4 hover:border-blue-500"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-ink-900">{vehicleLabel(item)}</p>
                    <p className="font-mono text-xs text-ink-500">
                      {item.referenceId} · …{(item.vin ?? '').slice(-6)}
                    </p>
                  </div>
                  <StatusBadge status={item.status} />
                </div>
                <div className="mt-2 text-sm text-ink-700">
                  {item.vehicle.mileage?.toLocaleString() ?? '—'} mi
                </div>
                <div className="mt-1 flex items-center justify-between text-xs text-ink-500">
                  <span>{sellerLabel(item)}</span>
                  <span>{formatRelativeAge(item.submittedAt ?? item.createdAt)}</span>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </RoleShell>
  );
}

function StatusBadge({ status }: { status: string }) {
  const badge = statusBadge(status);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${badge.className}`}
    >
      ● {badge.label}
    </span>
  );
}
