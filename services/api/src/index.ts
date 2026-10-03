import { existsSync } from 'node:fs';
import mongoose from 'mongoose';
import { createApp } from './app';
import { connectDB } from './db/connection';

// Local dev convenience only — deployed environments (Render, CI) set real
// process env vars directly and won't have this file.
if (existsSync('.env.local')) {
  process.loadEnvFile('.env.local');
}

const port = Number(process.env.PORT ?? 4000);

// Several of these silently fall back to dev defaults (e.g. WEB_ORIGIN → localhost),
// so a misconfigured deploy would boot but be broken. Fail loudly instead.
const REQUIRED_IN_PRODUCTION = [
  'MONGODB_URI',
  'JWT_ACCESS_SECRET',
  'WEB_ORIGIN',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
];

function assertProductionEnv(): void {
  if (process.env.NODE_ENV !== 'production') return;
  const missing = REQUIRED_IN_PRODUCTION.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY is not set — notification emails will be logged, not sent');
  }
}

async function main() {
  assertProductionEnv();
  await connectDB();
  const server = createApp().listen(port, () => {
    console.log(`API listening on port ${port}`);
  });

  // Render sends SIGTERM before swapping instances on deploy; finish in-flight requests first.
  const shutdown = (signal: string) => {
    console.log(`${signal} received, shutting down`);
    server.close(() => {
      void mongoose.disconnect().finally(() => process.exit(0));
    });
  };
  process.once('SIGTERM', () => shutdown('SIGTERM'));
  process.once('SIGINT', () => shutdown('SIGINT'));
}

main().catch((error: unknown) => {
  console.error('Failed to start API', error);
  process.exit(1);
});
