import { existsSync } from 'node:fs';
import mongoose from 'mongoose';
import { connectDB } from '../db/connection.js';
import { hashPassword } from '../lib/password.js';
import { DEFAULT_TENANT_ID } from '../lib/tenant.js';
import { User } from '../models/User.js';

/**
 * Bootstraps the first admin account — self-registration only ever creates pending sellers.
 * Usage: ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run create-admin --workspace services/api
 * The account is created with mustChangePassword so the bootstrap password is short-lived.
 */
if (existsSync('.env.local')) {
  process.loadEnvFile('.env.local');
}

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD must be set');
  }
  if (password.length < 12) {
    throw new Error('ADMIN_PASSWORD must be at least 12 characters');
  }

  await connectDB();

  const existing = await User.findOne({ email });
  if (existing) {
    console.log(`[create-admin] ${email} already exists (role=${existing.role}); nothing to do`);
    await mongoose.disconnect();
    return;
  }

  await User.create({
    email,
    passwordHash: await hashPassword(password),
    role: 'admin',
    tenantId: DEFAULT_TENANT_ID,
    status: 'active',
    mustChangePassword: true,
  });
  console.log(`[create-admin] created admin ${email}`);

  await mongoose.disconnect();
}

main().catch((error) => {
  console.error('[create-admin] failed', error);
  process.exitCode = 1;
  return mongoose.disconnect();
});
