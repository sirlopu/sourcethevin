import { Schema, model } from 'mongoose';

const counterSchema = new Schema({
  _id: { type: String, required: true },
  seq: { type: Number, required: true, default: 0 },
});

const Counter = model('Counter', counterSchema);

/** Atomically increments and returns the next sequence number for `key`. */
export async function nextSequence(key: string): Promise<number> {
  const counter = await Counter.findByIdAndUpdate(
    key,
    { $inc: { seq: 1 } },
    { upsert: true, new: true },
  );
  return counter.seq;
}

/** Human-friendly submission reference, e.g. "STV-2026-00042". */
export async function nextSubmissionReferenceId(): Promise<string> {
  const year = new Date().getFullYear();
  const seq = await nextSequence(`submission-${year}`);
  return `STV-${year}-${String(seq).padStart(5, '0')}`;
}
