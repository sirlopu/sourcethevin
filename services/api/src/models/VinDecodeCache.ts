import { Schema, model } from 'mongoose';
import type { VinDecodeResult } from '@sourcethevin/shared';

const ONE_DAY_SECONDS = 24 * 60 * 60;

const vinDecodeCacheSchema = new Schema({
  vin: { type: String, required: true, unique: true },
  result: { type: Schema.Types.Mixed, required: true },
  decodedAt: { type: Date, required: true, default: Date.now },
});

// TTL index — MongoDB automatically drops the document 24h after decodedAt.
vinDecodeCacheSchema.index({ decodedAt: 1 }, { expireAfterSeconds: ONE_DAY_SECONDS });

export interface VinDecodeCacheDocument {
  vin: string;
  result: VinDecodeResult;
  decodedAt: Date;
}

export const VinDecodeCache = model('VinDecodeCache', vinDecodeCacheSchema);
