import type { Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import type { AuthenticatedUser } from './requireAuth';
import { requireRole } from './requireRole';

function createMockRes() {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
}

function userFixture(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    id: 'user-1',
    email: 'user@example.com',
    role: 'seller',
    tenantId: 'tenant-1',
    status: 'active',
    ...overrides,
  };
}

describe('requireRole', () => {
  it('rejects when there is no authenticated user on the request', () => {
    const req = {} as Request;
    const res = createMockRes();
    const next = vi.fn();

    requireRole('admin')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects a user whose role is not in the allowed list', () => {
    const req = { user: userFixture({ role: 'seller' }) } as Request;
    const res = createMockRes();
    const next = vi.fn();

    requireRole('admin', 'trade_desk')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('allows a user whose role is in the allowed list', () => {
    const req = { user: userFixture({ role: 'admin' }) } as Request;
    const res = createMockRes();
    const next = vi.fn();

    requireRole('admin', 'trade_desk')(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });
});
