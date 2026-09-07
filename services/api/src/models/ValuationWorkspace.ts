import { Schema, model, Types, type InferSchemaType } from 'mongoose';

const bidReferenceSchema = new Schema(
  {
    source: { type: String, required: true },
    amount: { type: Number, required: true },
    loggedAt: { type: Date, required: true, default: Date.now },
  },
  { _id: false },
);

const estimatedExpensesSchema = new Schema(
  {
    transport: { type: Number, default: 0 },
    recon: { type: Number, default: 0 },
    arbitrationCondition: { type: Number, default: 0 },
    other: { type: Number, default: 0 },
  },
  { _id: false },
);

const buyerOverrideSchema = new Schema(
  {
    amount: { type: Number, required: true },
    reason: { type: String, required: true },
    loggedBy: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    loggedAt: { type: Date, required: true, default: Date.now },
  },
  { _id: false },
);

const valuationWorkspaceSchema = new Schema(
  {
    submissionId: { type: Schema.Types.ObjectId, required: true, unique: true, ref: 'Submission' },
    tenantId: { type: Schema.Types.ObjectId, required: true },
    bidReferences: { type: [bidReferenceSchema], default: [] },
    estimatedExpenses: { type: estimatedExpensesSchema, default: () => ({}) },
    targetMargin: { type: Number, default: 0 },
    // Always server-computed — never accepted from the client. See lib/valuation.ts.
    recommendedMaxAcquisition: { type: Number, default: 0 },
    buyerOverride: buyerOverrideSchema,
    internalNotes: { type: String, default: '' },
  },
  // minimize: false — see Submission.ts for why (empty nested objects would
  // otherwise vanish from the JSON response instead of serializing as `{}`).
  { timestamps: true, minimize: false },
);

export type ValuationWorkspaceDocument = InferSchemaType<typeof valuationWorkspaceSchema> & {
  _id: Types.ObjectId;
};
export const ValuationWorkspace = model('ValuationWorkspace', valuationWorkspaceSchema);
