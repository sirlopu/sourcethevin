import { z } from 'zod';

export const OFFER_STATUSES = ['pending', 'accepted', 'declined', 'superseded'] as const;
export type OfferStatus = (typeof OFFER_STATUSES)[number];

export const OFFER_CREATOR_ROLES = ['trade_desk', 'seller'] as const;
export type OfferCreatorRole = (typeof OFFER_CREATOR_ROLES)[number];

export const offerCreateInputSchema = z.object({
  amount: z.number().gt(0),
  expiresAt: z.string().datetime(),
  terms: z.string().trim().max(2000).optional(),
});
export type OfferCreateInput = z.infer<typeof offerCreateInputSchema>;

export const offerCounterInputSchema = z.object({
  amount: z.number().gt(0),
  notes: z.string().trim().max(2000).optional(),
});
export type OfferCounterInput = z.infer<typeof offerCounterInputSchema>;
