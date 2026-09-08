import { ApiError } from './api';
import type { AuthFetch } from './auth-context';
import { parseJson } from './http';
import type { Role } from './role';

export interface AdminDealership {
  name: string;
  licenseNumber: string;
  phone: string;
}

export interface AdminUserRecord {
  id: string;
  email: string;
  role: Role;
  status: 'pending' | 'active' | 'suspended';
  dealership: AdminDealership | null;
  lastActiveAt: string;
  createdAt: string;
}

export interface TenantInfo {
  id: string;
  environment: string;
  activeUserCount: number;
  transport: string;
}

export interface AdminUsersResponse {
  items: AdminUserRecord[];
  pendingCount: number;
  tenant: TenantInfo;
}

export function listAdminUsers(authFetch: AuthFetch) {
  return parseJson<AdminUsersResponse>(authFetch('/admin/users'));
}

export interface InviteUserInput {
  email: string;
  role: Role;
  dealership?: AdminDealership;
}

export function inviteUser(authFetch: AuthFetch, input: InviteUserInput) {
  return parseJson<{ user: AdminUserRecord; temporaryPassword: string }>(
    authFetch('/admin/users', { method: 'POST', body: JSON.stringify(input) }),
  );
}

export function updateUserRole(authFetch: AuthFetch, id: string, role: Role) {
  return parseJson<AdminUserRecord>(
    authFetch(`/admin/users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) }),
  );
}

export function updateUserStatus(authFetch: AuthFetch, id: string, status: 'active' | 'suspended') {
  return parseJson<AdminUserRecord>(
    authFetch(`/admin/users/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  );
}

export function approveSellerRequest(authFetch: AuthFetch, id: string) {
  return parseJson<AdminUserRecord>(
    authFetch(`/admin/seller-requests/${id}/approve`, { method: 'POST' }),
  );
}

export async function rejectSellerRequest(authFetch: AuthFetch, id: string): Promise<void> {
  const response = await authFetch(`/admin/seller-requests/${id}/reject`, { method: 'POST' });
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => undefined);
    const message =
      body && typeof body === 'object' && 'error' in body && typeof body.error === 'string'
        ? body.error
        : 'Unable to reject this request. Please try again.';
    throw new ApiError(response.status, message);
  }
}
