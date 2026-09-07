import { z } from 'zod';
import { SUBMISSION_STATUSES } from '../models/Submission';

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');

export const listSubmissionsQuerySchema = z.object({
  status: z.enum(SUBMISSION_STATUSES).optional(),
  seller: objectIdSchema.optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  page: z.coerce.number().int().gte(1).default(1),
  limit: z.coerce.number().int().gte(1).lte(100).default(25),
});
export type ListSubmissionsQuery = z.infer<typeof listSubmissionsQuerySchema>;
