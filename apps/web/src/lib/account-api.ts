import type { AuthFetch } from './auth-context';
import { parseJson } from './http';

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export function changePassword(authFetch: AuthFetch, input: ChangePasswordInput) {
  return parseJson<{ ok: true }>(
    authFetch('/auth/password', { method: 'PATCH', body: JSON.stringify(input) }),
  );
}
