import { z } from 'zod';
import { vinSchema } from './vehicle';

export const vinDecodeResultSchema = z.object({
  vin: vinSchema,
  year: z.number().int().nullable(),
  make: z.string().nullable(),
  model: z.string().nullable(),
  trim: z.string().nullable(),
  drivetrain: z.string().nullable(),
  engine: z.string().nullable(),
});

export type VinDecodeResult = z.infer<typeof vinDecodeResultSchema>;
