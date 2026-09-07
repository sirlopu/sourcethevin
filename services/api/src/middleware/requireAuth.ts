import type { NextFunction, Request, Response } from 'express';
import { verifyAccessToken } from '../lib/tokens';
import { User, type UserRole, type UserStatus } from '../models/User';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  tenantId: string;
  status: UserStatus;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : undefined;
  if (!token) {
    res.status(401).json({ error: 'Missing access token' });
    return;
  }

  let claims;
  try {
    claims = verifyAccessToken(token);
  } catch {
    res.status(401).json({ error: 'Invalid or expired access token' });
    return;
  }

  // Re-check the user's current status in the database on every request —
  // a valid JWT alone doesn't reflect a suspension that happened after it was issued.
  const user = await User.findById(claims.sub);
  if (!user) {
    res.status(401).json({ error: 'User not found' });
    return;
  }
  if (user.status !== 'active') {
    res.status(403).json({ error: 'Account is not active' });
    return;
  }

  req.user = {
    id: user._id.toString(),
    email: user.email,
    role: user.role,
    tenantId: user.tenantId.toString(),
    status: user.status,
  };
  next();
}
