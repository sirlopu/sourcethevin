import mongoose from 'mongoose';
import { connectDB } from '../db/connection.js';
import { ValuationWorkspace } from '../models/ValuationWorkspace.js';

async function main() {
  await connectDB();

  const legacyWorkspaces = await ValuationWorkspace.collection
    .find({ internalNotes: { $type: 'string' } })
    .project({
      _id: 1,
      internalNotes: 1,
      createdAt: 1,
      updatedAt: 1,
    })
    .toArray();

  let migrated = 0;
  let cleared = 0;

  for (const workspace of legacyWorkspaces) {
    const legacyText = typeof workspace.internalNotes === 'string' ? workspace.internalNotes : '';
    const createdAt =
      workspace.updatedAt instanceof Date
        ? workspace.updatedAt
        : workspace.createdAt instanceof Date
          ? workspace.createdAt
          : new Date();
    const update: Record<string, unknown> = { $unset: { internalNotes: '' } };
    if (legacyText.trim()) {
      update.$push = {
        internalNoteHistory: {
          $each: [{ text: legacyText, createdAt }],
          $sort: { createdAt: -1 },
        },
      };
    }

    const result = await ValuationWorkspace.collection.updateOne(
      { _id: workspace._id, internalNotes: legacyText },
      update,
    );

    if (result.modifiedCount > 0) {
      if (legacyText.trim()) migrated += 1;
      else cleared += 1;
    }
  }

  console.log(
    `[migrate-internal-note-history] scanned ${legacyWorkspaces.length} workspace(s), migrated ${migrated} note(s), cleared ${cleared} empty legacy field(s)`,
  );

  await mongoose.disconnect();
}

main().catch((error) => {
  console.error('[migrate-internal-note-history] failed', error);
  process.exitCode = 1;
  return mongoose.disconnect();
});
