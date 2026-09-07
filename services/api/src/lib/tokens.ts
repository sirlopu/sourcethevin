import jwt from 'jsonwebtoken';
import { createHash, randomBytes } from 'node:crypto';
import type { UserRole } from '../models/User';

export interface AccessTokenClaims {
  sub: string;
  role: UserRole;
  tenantId: string;
}

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function getAccessTokenSecret(): string {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) {
    throw new Error('JWT_ACCESS_SECRET is not set');
  }
  return secret;
}

export function signAccessToken(claims: AccessTokenClaims): string {
  return jwt.sign(claims, getAccessTokenSecret(), { expiresIn: ACCESS_TOKEN_TTL });
}

export function verifyAccessToken(token: string): AccessTokenClaims {
  return jwt.verify(token, getAccessTokenSecret()) as AccessTokenClaims;
}

export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function generateRefreshToken(): { token: string; hash: string; expiresAt: Date } {
  const token = randomBytes(32).toString('hex');
  return {
    token,
    hash: hashRefreshToken(token),
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
  };
}
