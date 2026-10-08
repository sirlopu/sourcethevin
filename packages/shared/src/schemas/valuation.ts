import { z } from 'zod';

export const bidReferenceInputSchema = z.object({
  source: z.string().trim().min(1),
  amount: z.number().gte(0),
  // Omitted for a new bid reference (server stamps "now"); echoed back by the
  // client for an existing one so re-saving the list doesn't reset its age.
  loggedAt: z.string().datetime().optional(),
});
export type BidReferenceInput = z.infer<typeof bidReferenceInputSchema>;

export const estimatedExpensesSchema = z.object({
  transport: z.number().gte(0),
  recon: z.number().gte(0),
  arbitrationCondition: z.number().gte(0),
  other: z.number().gte(0),
});
export type EstimatedExpenses = z.infer<typeof estimatedExpensesSchema>;

export const internalNoteInputSchema = z.object({
  text: z.string().trim().min(1).max(4000),
});
export type InternalNoteInput = z.infer<typeof internalNoteInputSchema>;

export const valuationInputSchema = z.object({
  bidReferences: z.array(bidReferenceInputSchema),
  estimatedExpenses: estimatedExpensesSchema,
  targetMargin: z.number().gte(0),
});
export type ValuationInput = z.infer<typeof valuationInputSchema>;

export const valuationOverrideInputSchema = z.object({
  amount: z.number().gte(0),
  reason: z.string().trim().min(1).max(1000),
});
export type ValuationOverrideInput = z.infer<typeof valuationOverrideInputSchema>;
