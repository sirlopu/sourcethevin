import type { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../models/User', () => ({
  User: { findById: vi.fn() },
}));

import { signAccessToken } from '../lib/tokens';
import { User } from '../models/User';
import { requireAuth } from './requireAuth';

function createMockRes() {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
}

beforeEach(() => {
  process.env.JWT_ACCESS_SECRET = 'test-secret';
  vi.mocked(User.findById).mockReset();
});

describe('requireAuth', () => {
  it('rejects requests with no Authorization header', async () => {
    const req = { headers: {} } as Request;
    const res = createMockRes();
    const next = vi.fn();

    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects an invalid or malformed access token', async () => {
    const req = { headers: { authorization: 'Bearer not-a-real-token' } } as Request;
    const res = createMockRes();
    const next = vi.fn();

    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
    expect(User.findById).not.toHaveBeenCalled();
  });

  it('rejects when the user no longer exists in the database', async () => {
    const token = signAccessToken({ sub: 'user-1', role: 'seller', tenantId: 'tenant-1' });
    vi.mocked(User.findById).mockResolvedValue(null);
    const req = { headers: { authorization: `Bearer ${token}` } } as Request;
    const res = createMockRes();
    const next = vi.fn();

    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it.each(['pending', 'suspended'] as const)(
    'rejects a %s user even with a valid, unexpired access token',
    async (status) => {
      const token = signAccessToken({ sub: 'user-1', role: 'seller', tenantId: 'tenant-1' });
      vi.mocked(User.findById).mockResolvedValue({
        _id: { toString: () => 'user-1' },
        email: 'seller@example.com',
        role: 'seller',
        tenantId: { toString: () => 'tenant-1' },
        status,
      } as never);
      const req = { headers: { authorization: `Bearer ${token}` } } as Request;
      const res = createMockRes();
      const next = vi.fn();

      await requireAuth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    },
  );

  it('re-checks the database rather than trusting the JWT, and attaches req.user for an active account', async () => {
    const token = signAccessToken({ sub: 'user-1', role: 'seller', tenantId: 'tenant-1' });
    vi.mocked(User.findById).mockResolvedValue({
      _id: { toString: () => 'user-1' },
      email: 'seller@example.com',
      role: 'seller',
      tenantId: { toString: () => 'tenant-1' },
      status: 'active',
    } as never);
    const req = { headers: { authorization: `Bearer ${token}` } } as Request;
    const res = createMockRes();
    const next = vi.fn();

    await requireAuth(req, res, next);

    expect(User.findById).toHaveBeenCalledWith('user-1');
    expect(next).toHaveBeenCalledOnce();
    expect(req.user).toEqual({
      id: 'user-1',
      email: 'seller@example.com',
      role: 'seller',
      tenantId: 'tenant-1',
      status: 'active',
    });
  });
});
