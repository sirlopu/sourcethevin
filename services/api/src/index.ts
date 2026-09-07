import { existsSync } from 'node:fs';
import { createApp } from './app';
import { connectDB } from './db/connection';

// Local dev convenience only — deployed environments (Render, CI) set real
// process env vars directly and won't have this file.
if (existsSync('.env.local')) {
  process.loadEnvFile('.env.local');
}

const port = Number(process.env.PORT ?? 4000);

async function main() {
  await connectDB();
  createApp().listen(port, () => {
    console.log(`API listening on port ${port}`);
  });
}

main().catch((error: unknown) => {
  console.error('Failed to start API', error);
  process.exit(1);
});
