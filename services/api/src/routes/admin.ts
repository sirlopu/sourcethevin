import { randomBytes } from 'node:crypto';
import { Router, type Request, type Response } from 'express';
import { hashPassword } from '../lib/password';
import { requireAuth } from '../middleware/requireAuth';
import { requireRole } from '../middleware/requireRole';
import { User, type UserDocument } from '../models/User';
import {
  inviteUserSchema,
  updateUserRoleSchema,
  updateUserStatusSchema,
} from '../validation/admin';

export const adminRouter = Router();
adminRouter.use(requireAuth, requireRole('admin'));

function paramId(req: Request): string {
  const { id } = req.params;
  return Array.isArray(id) ? (id[0] ?? '') : (id ?? '');
}

function serializeUser(user: UserDocument) {
  return {
    id: user._id.toString(),
    email: user.email,
    role: user.role,
    status: user.status,
    dealership: user.dealership
      ? {
          name: user.dealership.name,
          licenseNumber: user.dealership.licenseNumber,
          phone: user.dealership.phone,
        }
      : null,
    // No dedicated "last active" field exists — updatedAt changes on login (refresh-token
    // rotation), so it's a reasonable proxy, not an exact last-seen timestamp.
    lastActiveAt: user.updatedAt,
    createdAt: user.createdAt,
  };
}

adminRouter.get('/users', async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId;
  // Unpaginated: expected scale is a handful of staff + sellers per tenant. Revisit if this
  // grows large enough to warrant the same page/limit pattern used for GET /submissions.
  const [users, activeUserCount] = await Promise.all([
    User.find({ tenantId }).sort({ createdAt: -1 }),
    User.countDocuments({ tenantId, status: 'active' }),
  ]);
  const items = users.map(serializeUser);
  const pendingCount = items.filter((u) => u.status === 'pending').length;

  res.status(200).json({
    items,
    pendingCount,
    tenant: {
      id: tenantId,
      environment: process.env.NODE_ENV ?? 'development',
      activeUserCount,
      transport: 'HTTPS / TLS',
    },
  });
});

adminRouter.post('/users', async (req: Request, res: Response) => {
  const parsed = inviteUserSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { email, role, dealership } = parsed.data;

  const existing = await User.findOne({ email });
  if (existing) {
    res.status(409).json({ error: 'An account with this email already exists' });
    return;
  }

  const temporaryPassword = randomBytes(18).toString('base64url');
  const passwordHash = await hashPassword(temporaryPassword);

  // Admin-created accounts are active immediately — the pending-approval pipeline is only for
  // seller self-registration.
  const user = await User.create({
    email,
    passwordHash,
    role,
    status: 'active',
    tenantId: req.user!.tenantId,
    ...(role === 'seller' ? { dealership } : {}),
  });

  res.status(201).json({ user: serializeUser(user), temporaryPassword });
});

adminRouter.patch('/users/:id/role', async (req: Request, res: Response) => {
  const id = paramId(req);
  if (id === req.user!.id) {
    res.status(400).json({ error: 'You cannot change your own role' });
    return;
  }

  const parsed = updateUserRoleSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const user = await User.findOne({ _id: id, tenantId: req.user!.tenantId }).catch(() => null);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  user.role = parsed.data.role;
  await user.save();
  res.status(200).json(serializeUser(user));
});

adminRouter.patch('/users/:id/status', async (req: Request, res: Response) => {
  const id = paramId(req);
  if (id === req.user!.id) {
    res.status(400).json({ error: 'You cannot change your own status' });
    return;
  }

  const parsed = updateUserStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const user = await User.findOne({ _id: id, tenantId: req.user!.tenantId }).catch(() => null);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  user.status = parsed.data.status;
  await user.save();
  res.status(200).json(serializeUser(user));
});

async function loadPendingSellerRequest(id: string, tenantId: string) {
  const user = await User.findOne({ _id: id, tenantId }).catch(() => null);
  if (!user || user.role !== 'seller' || user.status !== 'pending') {
    return null;
  }
  return user;
}

adminRouter.post('/seller-requests/:id/approve', async (req: Request, res: Response) => {
  const user = await loadPendingSellerRequest(paramId(req), req.user!.tenantId);
  if (!user) {
    res.status(409).json({ error: 'This account is not a pending seller request' });
    return;
  }
  user.status = 'active';
  await user.save();
  res.status(200).json(serializeUser(user));
});

adminRouter.post('/seller-requests/:id/reject', async (req: Request, res: Response) => {
  const user = await loadPendingSellerRequest(paramId(req), req.user!.tenantId);
  if (!user) {
    res.status(409).json({ error: 'This account is not a pending seller request' });
    return;
  }
  await user.deleteOne();
  res.status(204).send();
});
