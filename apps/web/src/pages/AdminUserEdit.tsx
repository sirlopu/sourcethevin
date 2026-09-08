import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ApiError } from '../lib/api';
import {
  listAdminUsers,
  updateUserRole,
  updateUserStatus,
  type AdminUserRecord,
  type TenantInfo,
} from '../lib/admin-api';
import { useAuth } from '../lib/auth-context';
import type { Role } from '../lib/role';

const ROLE_OPTIONS: Array<{ value: Role; label: string; subtext: string }> = [
  { value: 'seller', label: 'Seller', subtext: 'Submit & track trade-ins' },
  { value: 'trade_desk', label: 'Trade Desk', subtext: 'Value & make offers' },
  { value: 'admin', label: 'Administrator', subtext: 'Manage users' },
];

export default function AdminUserEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: currentUser, authFetch } = useAuth();

  const [target, setTarget] = useState<AdminUserRecord | null>(null);
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [role, setRole] = useState<Role>('seller');
  const [status, setStatus] = useState<'active' | 'suspended'>('active');

  useEffect(() => {
    let cancelled = false;
    listAdminUsers(authFetch)
      .then((result) => {
        if (cancelled) return;
        const found = result.items.find((u) => u.id === id);
        if (!found) {
          setNotFound(true);
          return;
        }
        setTarget(found);
        setTenant(result.tenant);
        setRole(found.role);
        setStatus(found.status === 'suspended' ? 'suspended' : 'active');
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : 'Unable to load this user.');
      });
    return () => {
      cancelled = true;
    };
  }, [id, authFetch]);

  const isSelf = target !== null && target.id === currentUser?.id;

  async function handleSave() {
    if (!target) return;
    setSaving(true);
    setError(null);
    try {
      if (role !== target.role) {
        await updateUserRole(authFetch, target.id, role);
      }
      if (status !== target.status) {
        await updateUserStatus(authFetch, target.id, status);
      }
      navigate('/admin/users');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to save changes.');
      setSaving(false);
    }
  }

  if (notFound) {
    return (
      <main className="mx-auto max-w-5xl p-8">
        <p className="text-sm text-ink-500">User not found.</p>
      </main>
    );
  }

  if (!target || !tenant) {
    return (
      <main className="mx-auto max-w-5xl p-8">
        <p className="text-sm text-ink-500">Loading…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl p-8">
      <div className="flex items-center gap-3 border-b border-ink-200 pb-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-900 text-sm font-semibold text-white">
          {target.email.charAt(0).toUpperCase()}
        </span>
        <div>
          <h1 className="font-display text-xl font-bold text-navy-900">{target.email}</h1>
          <p className="text-xs text-ink-500">Edit user — role assignment</p>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm font-medium text-danger">
          {error}
        </p>
      )}

      <div className="mt-6 grid grid-cols-1 gap-8 md:grid-cols-[2fr_1fr]">
        <div className="space-y-5 rounded-md border border-ink-200 bg-white p-5">
          {isSelf && (
            <p className="rounded-md bg-ink-50 px-3 py-2 text-xs text-ink-600">
              You can&rsquo;t change your own role or status. Ask another administrator to make this
              change.
            </p>
          )}

          <fieldset disabled={isSelf} className="space-y-2">
            <legend className="text-xs font-semibold uppercase tracking-wide text-ink-500">
              Role
            </legend>
            {ROLE_OPTIONS.map((option) => (
              <label
                key={option.value}
                className="flex items-start gap-3 rounded-md border border-ink-200 p-3 has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50"
              >
                <input
                  type="radio"
                  name="role"
                  value={option.value}
                  checked={role === option.value}
                  onChange={() => setRole(option.value)}
                  className="mt-1"
                />
                <span>
                  <span className="block text-sm font-semibold text-ink-900">{option.label}</span>
                  <span className="block text-xs text-ink-500">{option.subtext}</span>
                </span>
              </label>
            ))}
          </fieldset>

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-ink-500">
              Status
            </span>
            <select
              disabled={isSelf}
              value={status}
              onChange={(event) => setStatus(event.target.value as 'active' | 'suspended')}
              className="mt-1 w-full rounded-md border-[1.5px] border-ink-300 px-2 py-1.5 text-sm outline-none focus:border-blue-500 disabled:bg-ink-50"
            >
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
          </label>

          <p className="rounded-md bg-ink-50 px-3 py-2 text-xs leading-relaxed text-ink-600">
            Sellers can only see their own submissions and offers. Internal valuations, margins and
            formulas are never visible to seller or admin accounts — they live only in the Trade
            Desk.
          </p>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              disabled={isSelf || saving}
              onClick={() => {
                void handleSave();
              }}
              className="rounded-md bg-navy-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-navy-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/admin/users')}
              className="rounded-md border-[1.5px] border-ink-300 px-3 py-1.5 text-sm font-semibold text-ink-700 hover:bg-ink-50"
            >
              Cancel
            </button>
          </div>
        </div>

        <div className="space-y-3 rounded-md border border-ink-200 bg-white p-5">
          <span className="inline-flex items-center rounded-full bg-ink-100 px-2 py-0.5 text-xs font-semibold text-ink-600">
            Single tenant · V1
          </span>
          <h2 className="text-sm font-bold text-navy-900">Tenant &amp; environment</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-2">
              <dt className="text-ink-500">Tenant ID</dt>
              <dd className="font-mono text-xs text-ink-900">{tenant.id}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-ink-500">Environment</dt>
              <dd className="text-ink-900">{tenant.environment}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-ink-500">Active users</dt>
              <dd className="text-ink-900">{tenant.activeUserCount}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-ink-500">Transport</dt>
              <dd className="text-ink-900">{tenant.transport}</dd>
            </div>
          </dl>
          <p className="text-xs leading-relaxed text-ink-500">
            The data model supports multiple tenants in the future without a core rebuild — this
            deployment currently runs a single tenant.
          </p>
        </div>
      </div>
    </main>
  );
}
