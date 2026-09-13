import { z } from 'zod';

export const messageCreateInputSchema = z.object({
  body: z.string().trim().min(1).max(2000),
});
export type MessageCreateInput = z.infer<typeof messageCreateInputSchema>;
