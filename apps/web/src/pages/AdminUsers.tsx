import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { NotificationBell } from '../components/NotificationBell';
import { ApiError } from '../lib/api';
import { useAuth } from '../lib/auth-context';
import {
  approveSellerRequest,
  inviteUser,
  listAdminUsers,
  rejectSellerRequest,
  resetUserPassword,
  type AdminUserRecord,
  type AdminUsersResponse,
} from '../lib/admin-api';
import { formatRelativeAge } from '../lib/relative-time';
import type { Role } from '../lib/role';
import { roleLabel, userStatusBadge } from '../lib/user-badges';

export default function AdminUsers() {
  const { user: currentUser, signOut, authFetch } = useAuth();
  const [data, setData] = useState<AdminUsersResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState<{
    email: string;
    password: string;
  } | null>(null);

  async function refresh() {
    try {
      const result = await listAdminUsers(authFetch);
      setData(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load users.');
    }
  }

  useEffect(() => {
    let cancelled = false;
    listAdminUsers(authFetch)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : 'Unable to load users.');
      });
    return () => {
      cancelled = true;
    };
  }, [authFetch]);

  const pendingUsers = data?.items.filter((u) => u.status === 'pending') ?? [];

  return (
    <main className="mx-auto w-full p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-ink-200 pb-4">
        <h1 className="font-display text-2xl font-bold text-navy-900">Users &amp; roles</h1>
        <div className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={() => setShowInvite((open) => !open)}
            className="rounded-md bg-navy-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-navy-800"
          >
            + Invite user
          </button>
          <NotificationBell />
          <button
            type="button"
            onClick={() => {
              void signOut();
            }}
            className="text-sm font-semibold text-blue-500 hover:underline"
          >
            Sign out
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm font-medium text-danger">
          {error}
        </p>
      )}

      {showInvite && (
        <InviteUserForm
          authFetch={authFetch}
          onInvited={(email, password) => {
            setTemporaryPassword({ email, password });
            setShowInvite(false);
            void refresh();
          }}
          onCancel={() => setShowInvite(false)}
        />
      )}

      {temporaryPassword && (
        <div className="mt-4 rounded-md border border-warning bg-warning-bg p-4 text-sm text-ink-900">
          <p className="font-semibold">New temporary password for {temporaryPassword.email}</p>
          <p className="mt-1">
            Share this temporary password out of band —{' '}
            <span className="font-mono font-semibold">{temporaryPassword.password}</span>. It
            won&rsquo;t be shown again.
          </p>
          <button
            type="button"
            onClick={() => setTemporaryPassword(null)}
            className="mt-2 text-xs font-semibold text-ink-600 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {pendingUsers.length > 0 && (
        <div className="mt-6 space-y-3">
          {pendingUsers.map((pending) => (
            <PendingRequestBanner
              key={pending.id}
              user={pending}
              authFetch={authFetch}
              onResolved={() => void refresh()}
            />
          ))}
        </div>
      )}

      {!data && !error && <p className="mt-6 text-sm text-ink-500">Loading…</p>}

      {data && (
        <div className="mt-6 xl:overflow-x-auto xl:rounded-md xl:border xl:border-ink-200">
          <table className="block w-full text-left text-sm xl:table">
            <thead className="hidden bg-ink-50 text-xs font-semibold uppercase tracking-wide text-ink-500 xl:table-header-group">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Org</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="whitespace-nowrap px-4 py-3">Last active</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:table-row-group">
              {data.items.map((item) => {
                const badge = userStatusBadge(item.status);
                return (
                  <tr
                    key={item.id}
                    className="block min-w-0 rounded-md border border-ink-200 p-4 xl:table-row xl:rounded-none xl:border-0 xl:border-t xl:p-0"
                  >
                    <td className="block pb-3 [overflow-wrap:anywhere] xl:table-cell xl:px-4 xl:py-3">
                      <p className="font-semibold text-ink-900">{item.email}</p>
                      {item.id === currentUser?.id && <p className="text-xs text-ink-500">(you)</p>}
                    </td>
                    <td className="block py-2 text-ink-700 [overflow-wrap:anywhere] xl:table-cell xl:px-4 xl:py-3">
                      <span className="mb-1 block text-xs text-ink-500 xl:hidden">Org</span>
                      {item.dealership?.name ?? '—'}
                    </td>
                    <td className="block py-2 text-ink-700 xl:table-cell xl:whitespace-nowrap xl:px-4 xl:py-3">
                      <span className="mb-1 block text-xs text-ink-500 xl:hidden">Role</span>
                      {roleLabel(item.role)}
                    </td>
                    <td className="block py-2 xl:table-cell xl:px-4 xl:py-3">
                      <span className="mb-1 block text-xs text-ink-500 xl:hidden">Status</span>
                      <span
                        className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                    </td>
                    <td className="block py-2 text-ink-500 xl:table-cell xl:whitespace-nowrap xl:px-4 xl:py-3">
                      <span className="mb-1 block text-xs text-ink-500 xl:hidden">Last active</span>
                      {formatRelativeAge(item.lastActiveAt)}
                    </td>
                    <td className="block pt-3 xl:table-cell xl:px-4 xl:py-3 xl:text-right">
                      <div className="flex flex-wrap items-center gap-3 xl:justify-end">
                        <ResetPasswordButton
                          user={item}
                          authFetch={authFetch}
                          onReset={(email, password) => {
                            setTemporaryPassword({ email, password });
                            void refresh();
                          }}
                        />
                        <Link
                          to={`/admin/users/${item.id}`}
                          className="text-sm font-semibold text-blue-500 hover:underline"
                        >
                          Edit
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

function PendingRequestBanner({
  user,
  authFetch,
  onResolved,
}: {
  user: AdminUserRecord;
  authFetch: ReturnType<typeof useAuth>['authFetch'];
  onResolved: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleApprove() {
    setBusy(true);
    setError(null);
    try {
      await approveSellerRequest(authFetch, user.id);
      onResolved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to approve this request.');
      setBusy(false);
    }
  }

  async function handleReject() {
    setBusy(true);
    setError(null);
    try {
      await rejectSellerRequest(authFetch, user.id);
      onResolved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to reject this request.');
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-warning bg-warning-bg px-4 py-3">
      <div className="text-sm text-ink-900">
        <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-warning align-middle" />
        <span className="font-semibold">{user.email}</span>
        {user.dealership && (
          <span className="text-ink-700">
            {' '}
            ({user.dealership.name}) requested seller access · {user.dealership.licenseNumber}
          </span>
        )}
        {error && <p className="mt-1 text-xs font-medium text-danger">{error}</p>}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            void handleApprove();
          }}
          className="rounded-md bg-success px-3 py-1.5 text-xs font-semibold text-white hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Approve
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            void handleReject();
          }}
          className="rounded-md border-[1.5px] border-danger px-3 py-1.5 text-xs font-semibold text-danger hover:bg-danger-bg disabled:cursor-not-allowed disabled:opacity-50"
        >
          Reject
        </button>
      </div>
    </div>
  );
}

function ResetPasswordButton({
  user,
  authFetch,
  onReset,
}: {
  user: AdminUserRecord;
  authFetch: ReturnType<typeof useAuth>['authFetch'];
  onReset: (email: string, password: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleReset() {
    setBusy(true);
    setError(null);
    try {
      const result = await resetUserPassword(authFetch, user.id);
      onReset(result.user.email, result.temporaryPassword);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to reset this password.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="text-right">
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          void handleReset();
        }}
        className="whitespace-nowrap text-sm font-semibold text-blue-500 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
      >
        Reset password
      </button>
      {error && <p className="mt-1 text-xs font-medium text-danger">{error}</p>}
    </div>
  );
}

function InviteUserForm({
  authFetch,
  onInvited,
  onCancel,
}: {
  authFetch: ReturnType<typeof useAuth>['authFetch'];
  onInvited: (email: string, password: string) => void;
  onCancel: () => void;
}) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('trade_desk');
  const [dealershipName, setDealershipName] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await inviteUser(authFetch, {
        email,
        role,
        dealership:
          role === 'seller'
            ? {
                ...(dealershipName.trim() ? { name: dealershipName } : {}),
                ...(licenseNumber.trim() ? { licenseNumber } : {}),
                phone,
              }
            : undefined,
      });
      onInvited(result.user.email, result.temporaryPassword);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to create this account.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-4 space-y-3 rounded-md border border-ink-200 bg-white p-4"
    >
      <p className="text-sm font-bold text-navy-900">Invite user</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs font-semibold text-ink-700">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-1 w-full rounded-md border-[1.5px] border-ink-300 px-2 py-1.5 text-sm outline-none focus:border-blue-500"
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-ink-700">Role</span>
          <select
            value={role}
            onChange={(event) => setRole(event.target.value as Role)}
            className="mt-1 w-full rounded-md border-[1.5px] border-ink-300 px-2 py-1.5 text-sm outline-none focus:border-blue-500"
          >
            <option value="seller">Seller</option>
            <option value="trade_desk">Trade Desk</option>
            <option value="admin">Administrator</option>
          </select>
        </label>
      </div>

      {role === 'seller' && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="block">
            <span className="text-xs font-semibold text-ink-700">Dealership name (optional)</span>
            <input
              value={dealershipName}
              onChange={(event) => setDealershipName(event.target.value)}
              className="mt-1 w-full rounded-md border-[1.5px] border-ink-300 px-2 py-1.5 text-sm outline-none focus:border-blue-500"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-ink-700">License # (optional)</span>
            <input
              value={licenseNumber}
              onChange={(event) => setLicenseNumber(event.target.value)}
              className="mt-1 w-full rounded-md border-[1.5px] border-ink-300 px-2 py-1.5 text-sm outline-none focus:border-blue-500"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-ink-700">Phone</span>
            <input
              required
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className="mt-1 w-full rounded-md border-[1.5px] border-ink-300 px-2 py-1.5 text-sm outline-none focus:border-blue-500"
            />
          </label>
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-navy-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-navy-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? 'Creating…' : 'Create account'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border-[1.5px] border-ink-300 px-3 py-1.5 text-sm font-semibold text-ink-700 hover:bg-ink-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
