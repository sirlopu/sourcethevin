import { Router, type CookieOptions, type Request, type Response } from 'express';
import { authRateLimiter } from '../middleware/rateLimit';
import { requireAuth } from '../middleware/requireAuth';
import { hashPassword, verifyPassword } from '../lib/password';
import { getSellerRequestRecipients, notify } from '../lib/notifications';
import { DEFAULT_TENANT_ID } from '../lib/tenant';
import { generateRefreshToken, hashRefreshToken, signAccessToken } from '../lib/tokens';
import { User } from '../models/User';
import { changePasswordSchema, loginSchema, registerSellerRequestSchema } from '../validation/auth';

const REFRESH_COOKIE_NAME = 'refreshToken';
const REFRESH_COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * SameSite=None is required while the web app and API live on different sites (e.g.
 * *.netlify.app → *.onrender.com); browsers then demand Secure. Once both share a parent
 * domain, COOKIE_SAMESITE=lax is the safer setting.
 */
function refreshCookieOptions(): CookieOptions {
  const sameSite = process.env.COOKIE_SAMESITE === 'none' ? 'none' : 'lax';
  return {
    httpOnly: true,
    secure: sameSite === 'none' || process.env.NODE_ENV === 'production',
    sameSite,
    path: '/auth',
  };
}

function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    ...refreshCookieOptions(),
    maxAge: REFRESH_COOKIE_MAX_AGE_MS,
  });
}

function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions());
}

export const authRouter = Router();
authRouter.use(authRateLimiter);

authRouter.post('/register-seller-request', async (req: Request, res: Response) => {
  const parsed = registerSellerRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { email, password, dealership } = parsed.data;

  const existing = await User.findOne({ email });
  if (existing) {
    res.status(409).json({ error: 'An account with this email already exists' });
    return;
  }

  const passwordHash = await hashPassword(password);
  const user = await User.create({
    email,
    passwordHash,
    role: 'seller',
    status: 'pending',
    tenantId: DEFAULT_TENANT_ID,
    dealership,
  });

  await notify({
    tenantId: user.tenantId,
    type: 'seller_request_received',
    recipients: await getSellerRequestRecipients(user.tenantId),
    title: 'New seller registration',
    body: `${user.email} requested a seller account and is awaiting approval.`,
    link: '/admin/users',
  });

  res.status(201).json({
    id: user._id.toString(),
    email: user.email,
    status: user.status,
  });
});

authRouter.post('/login', async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { email, password } = parsed.data;

  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user || !(await verifyPassword(user.passwordHash, password))) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }
  if (user.status !== 'active') {
    res.status(403).json({ error: 'Account is not active' });
    return;
  }

  const accessToken = signAccessToken({
    sub: user._id.toString(),
    role: user.role,
    tenantId: user.tenantId.toString(),
    mustChangePassword: user.mustChangePassword,
  });

  const { token: refreshToken, hash, expiresAt } = generateRefreshToken();
  user.refreshTokenHash = hash;
  user.refreshTokenExpiresAt = expiresAt;
  await user.save();

  setRefreshCookie(res, refreshToken);
  res.status(200).json({
    accessToken,
    user: {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      tenantId: user.tenantId.toString(),
      mustChangePassword: user.mustChangePassword,
    },
  });
});

authRouter.patch('/password', requireAuth, async (req: Request, res: Response) => {
  const parsed = changePasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { currentPassword, newPassword } = parsed.data;

  const user = await User.findById(req.user!.id).select('+passwordHash');
  if (!user || !(await verifyPassword(user.passwordHash, currentPassword))) {
    res.status(401).json({ error: 'Current password is incorrect' });
    return;
  }

  user.passwordHash = await hashPassword(newPassword);
  user.mustChangePassword = false;
  await user.save();

  res.status(200).json({ ok: true });
});

authRouter.post('/refresh', async (req: Request, res: Response) => {
  const token = req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined;
  if (!token) {
    res.status(401).json({ error: 'Missing refresh token' });
    return;
  }

  const hash = hashRefreshToken(token);
  const user = await User.findOne({ refreshTokenHash: hash }).select(
    '+refreshTokenHash +refreshTokenExpiresAt',
  );
  if (!user || !user.refreshTokenExpiresAt || user.refreshTokenExpiresAt.getTime() < Date.now()) {
    clearRefreshCookie(res);
    res.status(401).json({ error: 'Invalid or expired refresh token' });
    return;
  }
  if (user.status !== 'active') {
    clearRefreshCookie(res);
    res.status(403).json({ error: 'Account is not active' });
    return;
  }

  const accessToken = signAccessToken({
    sub: user._id.toString(),
    role: user.role,
    tenantId: user.tenantId.toString(),
    mustChangePassword: user.mustChangePassword,
  });

  const { token: nextRefreshToken, hash: nextHash, expiresAt } = generateRefreshToken();
  user.refreshTokenHash = nextHash;
  user.refreshTokenExpiresAt = expiresAt;
  await user.save();

  setRefreshCookie(res, nextRefreshToken);
  res.status(200).json({ accessToken });
});

authRouter.post('/logout', async (req: Request, res: Response) => {
  const token = req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined;
  if (token) {
    const hash = hashRefreshToken(token);
    await User.updateOne(
      { refreshTokenHash: hash },
      { refreshTokenHash: null, refreshTokenExpiresAt: null },
    );
  }
  clearRefreshCookie(res);
  res.status(204).send();
});
