import mongoose from 'mongoose';
import { connectDB } from '../db/connection.js';
import { Submission } from '../models/Submission.js';

const DAMAGE_SLOTS = ['damage_1', 'damage_2', 'damage_3', 'damage_4'];

async function main() {
  await connectDB();

  const affected = await Submission.find({ 'photos.slot': 'damage' });

  let updated = 0;
  let anomalies = 0;

  for (const submission of affected) {
    const takenSlots = new Set(
      submission.photos.map((photo) => photo.slot).filter((slot) => slot !== 'damage'),
    );
    const freeSlots = DAMAGE_SLOTS.filter((slot) => !takenSlots.has(slot));

    for (const photo of submission.photos) {
      if (photo.slot !== 'damage') continue;
      const nextSlot = freeSlots.shift();
      if (!nextSlot) {
        console.warn(
          `[migrate-legacy-damage-slot] submission ${submission._id.toString()} has more than ${DAMAGE_SLOTS.length} legacy "damage" photos; dropping overflow entry (publicId=${photo.publicId})`,
        );
        anomalies += 1;
        // @ts-expect-error slot is validated by the enum right after this loop
        photo.slot = undefined;
        continue;
      }
      photo.slot = nextSlot;
    }

    submission.photos = submission.photos.filter((photo) => photo.slot != null) as typeof submission.photos;

    await submission.save({ validateBeforeSave: true });
    updated += 1;
  }

  console.log(
    `[migrate-legacy-damage-slot] scanned ${affected.length} affected submission(s), updated ${updated}, anomalies ${anomalies}`,
  );

  await mongoose.disconnect();
}

main().catch((error) => {
  console.error('[migrate-legacy-damage-slot] failed', error);
  process.exitCode = 1;
  return mongoose.disconnect();
});
