import type { NextFunction, Request, Response } from 'express';
import type { UserRole } from '../models/User';

export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient role' });
      return;
    }
    next();
  };
}
