import { beforeEach, describe, expect, it } from 'vitest';
import {
  generateRefreshToken,
  hashRefreshToken,
  signAccessToken,
  verifyAccessToken,
} from './tokens';

beforeEach(() => {
  process.env.JWT_ACCESS_SECRET = 'test-access-secret';
});

describe('signAccessToken / verifyAccessToken', () => {
  it('round-trips the claims', () => {
    const token = signAccessToken({
      sub: 'user-1',
      role: 'seller',
      tenantId: 'tenant-1',
      mustChangePassword: false,
    });
    const claims = verifyAccessToken(token);
    expect(claims.sub).toBe('user-1');
    expect(claims.role).toBe('seller');
    expect(claims.tenantId).toBe('tenant-1');
    expect(claims.mustChangePassword).toBe(false);
  });

  it('issues a short-lived token with an expiry claim', () => {
    const token = signAccessToken({
      sub: 'user-1',
      role: 'admin',
      tenantId: 'tenant-1',
      mustChangePassword: false,
    });
    const payloadSegment = token.split('.')[1];
    if (!payloadSegment) {
      throw new Error('Token is missing a payload segment');
    }
    const payload = JSON.parse(Buffer.from(payloadSegment, 'base64url').toString('utf8'));
    expect(payload.exp).toBeTypeOf('number');
    expect(payload.exp - payload.iat).toBe(15 * 60);
  });

  it('rejects a token signed with a different secret', () => {
    const token = signAccessToken({
      sub: 'user-1',
      role: 'seller',
      tenantId: 'tenant-1',
      mustChangePassword: false,
    });
    process.env.JWT_ACCESS_SECRET = 'a-different-secret';
    expect(() => verifyAccessToken(token)).toThrow();
  });

  it('throws when JWT_ACCESS_SECRET is not set', () => {
    delete process.env.JWT_ACCESS_SECRET;
    expect(() =>
      signAccessToken({
        sub: 'user-1',
        role: 'seller',
        tenantId: 'tenant-1',
        mustChangePassword: false,
      }),
    ).toThrow('JWT_ACCESS_SECRET is not set');
  });
});

describe('generateRefreshToken', () => {
  it('returns a token whose hash matches hashRefreshToken', () => {
    const { token, hash } = generateRefreshToken();
    expect(hash).toBe(hashRefreshToken(token));
  });

  it('produces a future expiry roughly 30 days out', () => {
    const { expiresAt } = generateRefreshToken();
    const days = (expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000);
    expect(days).toBeGreaterThan(29.9);
    expect(days).toBeLessThan(30.1);
  });

  it('generates unique tokens on each call', () => {
    const a = generateRefreshToken();
    const b = generateRefreshToken();
    expect(a.token).not.toBe(b.token);
    expect(a.hash).not.toBe(b.hash);
  });
});
