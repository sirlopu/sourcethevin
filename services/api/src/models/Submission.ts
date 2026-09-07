import { Schema, model, Types, type InferSchemaType } from 'mongoose';
import {
  ACCIDENT_HISTORY_OPTIONS,
  CONDITION_RATING_OPTIONS,
  COSMETIC_ISSUE_OPTIONS,
  LIEN_STATUS_OPTIONS,
  PHOTO_SLOT_KEYS,
  RUNS_AND_DRIVES_OPTIONS,
  TITLE_STATUS_OPTIONS,
  WARNING_LIGHTS_OPTIONS,
} from '@sourcethevin/shared';

export const SUBMISSION_STATUSES = [
  'new',
  'submitted',
  'offer_sent',
  'accepted',
  'declined',
] as const;
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];

const decodedSchema = new Schema(
  {
    year: Number,
    make: String,
    model: String,
    trim: String,
    drivetrain: String,
    engine: String,
  },
  { _id: false },
);

const vehicleSchema = new Schema(
  {
    year: Number,
    make: String,
    model: String,
    trim: String,
    drivetrain: String,
    engine: String,
    mileage: Number,
    exteriorColor: String,
  },
  { _id: false },
);

const conditionSchema = new Schema(
  {
    runsAndDrives: { type: String, enum: RUNS_AND_DRIVES_OPTIONS },
    warningLights: { type: String, enum: WARNING_LIGHTS_OPTIONS },
    warningLightsDescription: String,
    accidentHistory: { type: String, enum: ACCIDENT_HISTORY_OPTIONS },
    cosmeticIssues: { type: [{ type: String, enum: COSMETIC_ISSUE_OPTIONS }], default: [] },
    tireCondition: { type: String, enum: CONDITION_RATING_OPTIONS },
    windshieldCondition: { type: String, enum: CONDITION_RATING_OPTIONS },
  },
  { _id: false },
);

const payoffSchema = new Schema(
  {
    expectedAllowance: Number,
    lienStatus: { type: String, enum: LIEN_STATUS_OPTIONS },
    payoffAmount: Number,
    titleStatus: { type: String, enum: TITLE_STATUS_OPTIONS },
    lienHolder: String,
    sellerNotes: String,
  },
  { _id: false },
);

const photoSchema = new Schema(
  {
    slot: { type: String, enum: PHOTO_SLOT_KEYS, required: true },
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    uploadedAt: { type: Date, required: true, default: Date.now },
  },
  { _id: false },
);

const submissionSchema = new Schema(
  {
    referenceId: { type: String, required: true, unique: true },
    sellerId: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    tenantId: { type: Schema.Types.ObjectId, required: true },
    status: { type: String, enum: SUBMISSION_STATUSES, required: true, default: 'new' },
    currentStep: { type: Number, min: 1, max: 6, default: 1 },
    vin: String,
    decoded: decodedSchema,
    vehicle: { type: vehicleSchema, default: () => ({}) },
    condition: { type: conditionSchema, default: () => ({}) },
    payoff: { type: payoffSchema, default: () => ({}) },
    photos: { type: [photoSchema], default: [] },
    submittedAt: Date,
  },
  // minimize: false — otherwise Mongoose strips still-empty nested objects (e.g. `payoff`
  // before step 4 is ever touched) out of the JSON response entirely, instead of `{}`.
  { timestamps: true, minimize: false },
);

export type SubmissionDocument = InferSchemaType<typeof submissionSchema> & { _id: Types.ObjectId };
export const Submission = model('Submission', submissionSchema);
