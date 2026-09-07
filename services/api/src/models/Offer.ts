import { Schema, model, Types, type InferSchemaType } from 'mongoose';
import { OFFER_CREATOR_ROLES, OFFER_STATUSES } from '@sourcethevin/shared';

const offerSchema = new Schema(
  {
    submissionId: { type: Schema.Types.ObjectId, required: true, ref: 'Submission' },
    tenantId: { type: Schema.Types.ObjectId, required: true },
    version: { type: Number, required: true },
    amount: { type: Number, required: true },
    expiresAt: { type: Date, required: true },
    terms: { type: String, default: '' },
    notes: { type: String, default: '' },
    status: { type: String, enum: OFFER_STATUSES, required: true, default: 'pending' },
    createdByRole: { type: String, enum: OFFER_CREATOR_ROLES, required: true },
    createdBy: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    respondedAt: Date,
    respondedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, minimize: false },
);

offerSchema.index({ submissionId: 1, version: -1 });

export type OfferDocument = InferSchemaType<typeof offerSchema> & { _id: Types.ObjectId };
export const Offer = model('Offer', offerSchema);
