import type { Role } from './role';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function extractErrorMessage(body: unknown): string {
  if (body && typeof body === 'object' && 'error' in body) {
    const { error } = body as { error: unknown };
    if (typeof error === 'string') return error;
  }
  return 'Something went wrong. Please try again.';
}

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init.headers },
  });

  const body = await response.json().catch(() => undefined);
  if (!response.ok) {
    throw new ApiError(response.status, extractErrorMessage(body));
  }
  return body as T;
}

export interface LoginResult {
  accessToken: string;
  user: { id: string; email: string; role: Role; tenantId: string; mustChangePassword: boolean };
}

export function login(email: string, password: string): Promise<LoginResult> {
  return apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export interface RequestSellerAccessInput {
  email: string;
  password: string;
  dealership: { name?: string; licenseNumber?: string; phone: string };
}

export function requestSellerAccess(
  input: RequestSellerAccessInput,
): Promise<{ id: string; status: string }> {
  return apiFetch('/auth/register-seller-request', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function refresh(): Promise<{ accessToken: string }> {
  return apiFetch('/auth/refresh', { method: 'POST' });
}

export function logout(): Promise<void> {
  return apiFetch('/auth/logout', { method: 'POST' });
}
