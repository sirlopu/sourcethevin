import { z } from 'zod';
import { vinSchema } from './vehicle';

// ── Step 2 · Vehicle info ──────────────────────────────────────────────────

export const vehicleInfoSchema = z.object({
  year: z
    .number()
    .int()
    .gte(1900)
    .lte(new Date().getFullYear() + 1)
    .nullable(),
  make: z.string().trim().nullable(),
  model: z.string().trim().nullable(),
  trim: z.string().trim().nullable(),
  drivetrain: z.string().trim().nullable(),
  engine: z.string().trim().nullable(),
  mileage: z.number().int().gte(0).nullable(),
  exteriorColor: z.string().trim().nullable(),
});
export type VehicleInfo = z.infer<typeof vehicleInfoSchema>;

// ── Step 3 · Condition ──────────────────────────────────────────────────────

export const RUNS_AND_DRIVES_OPTIONS = ['yes', 'starts_only', 'no'] as const;
export const runsAndDrivesSchema = z.enum(RUNS_AND_DRIVES_OPTIONS);

export const WARNING_LIGHTS_OPTIONS = ['none', 'check_engine', 'other'] as const;
export const warningLightsSchema = z.enum(WARNING_LIGHTS_OPTIONS);

export const ACCIDENT_HISTORY_OPTIONS = ['clean', 'repaired', 'unrepaired'] as const;
export const accidentHistorySchema = z.enum(ACCIDENT_HISTORY_OPTIONS);

export const CONDITION_RATING_OPTIONS = ['good', 'fair', 'poor'] as const;
export const conditionRatingSchema = z.enum(CONDITION_RATING_OPTIONS);

export const COSMETIC_ISSUE_OPTIONS = [
  'minor_scratches',
  'dents',
  'curbed_wheels',
  'interior_wear',
] as const;
export const cosmeticIssueSchema = z.enum(COSMETIC_ISSUE_OPTIONS);

export const conditionSchema = z.object({
  runsAndDrives: runsAndDrivesSchema.nullable(),
  warningLights: warningLightsSchema.nullable(),
  warningLightsDescription: z.string().trim().max(500).nullable(),
  accidentHistory: accidentHistorySchema.nullable(),
  cosmeticIssues: z.array(cosmeticIssueSchema),
  tireCondition: conditionRatingSchema.nullable(),
  windshieldCondition: conditionRatingSchema.nullable(),
});
export type Condition = z.infer<typeof conditionSchema>;

// ── Step 4 · Trade & payoff ─────────────────────────────────────────────────

export const LIEN_STATUS_OPTIONS = ['none', 'active_lien'] as const;
export const lienStatusSchema = z.enum(LIEN_STATUS_OPTIONS);

export const TITLE_STATUS_OPTIONS = ['in_hand', 'with_lienholder', 'lost'] as const;
export const titleStatusSchema = z.enum(TITLE_STATUS_OPTIONS);

export const payoffSchema = z.object({
  expectedAllowance: z.number().gte(0).nullable(),
  lienStatus: lienStatusSchema.nullable(),
  payoffAmount: z.number().gte(0).nullable(),
  titleStatus: titleStatusSchema.nullable(),
  lienHolder: z.string().trim().nullable(),
  sellerNotes: z.string().trim().max(2000).nullable(),
});
export type Payoff = z.infer<typeof payoffSchema>;

// ── Step 5 · Guided photo capture ───────────────────────────────────────────

export const PHOTO_SLOTS = [
  { key: 'front', label: 'Front' },
  { key: 'rear', label: 'Rear' },
  { key: 'driver_side', label: 'Driver side' },
  { key: 'passenger_side', label: 'Passenger side' },
  { key: 'interior', label: 'Interior' },
  { key: 'odometer', label: 'Odometer' },
  { key: 'vin_label', label: 'VIN label' },
  { key: 'dashboard', label: 'Dash' },
  { key: 'damage', label: 'Damage (up to 4)' },
] as const;

export const PHOTO_SLOT_KEYS = PHOTO_SLOTS.map((slot) => slot.key) as [string, ...string[]];
export const photoSlotSchema = z.enum(PHOTO_SLOT_KEYS);
export type PhotoSlot = z.infer<typeof photoSlotSchema>;

export const MIN_REQUIRED_PHOTOS = 6;
export const MAX_DAMAGE_PHOTOS = 4;

export function photoSlotLabel(slot: string): string {
  return PHOTO_SLOTS.find((s) => s.key === slot)?.label ?? slot;
}

// ── PATCH payload (autosave) ────────────────────────────────────────────────

export const submissionPatchSchema = z.object({
  currentStep: z.number().int().gte(1).lte(6).optional(),
  vin: vinSchema.optional(),
  decoded: z
    .object({
      year: z.number().int().nullable(),
      make: z.string().nullable(),
      model: z.string().nullable(),
      trim: z.string().nullable(),
      drivetrain: z.string().nullable(),
      engine: z.string().nullable(),
    })
    .nullable()
    .optional(),
  vehicle: vehicleInfoSchema.partial().optional(),
  condition: conditionSchema.partial().optional(),
  payoff: payoffSchema.partial().optional(),
});
export type SubmissionPatch = z.infer<typeof submissionPatchSchema>;
