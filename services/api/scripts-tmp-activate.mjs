import { existsSync } from 'node:fs';
if (existsSync('.env.local')) process.loadEnvFile('.env.local');
import mongoose from 'mongoose';
import { User } from './src/models/User.ts';

await mongoose.connect(process.env.MONGODB_URI);
await User.updateOne({ email: process.argv[2] }, { status: 'active' });
console.log('activated');
await mongoose.disconnect();
