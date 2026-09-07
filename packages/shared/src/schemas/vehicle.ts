import { z } from 'zod';

export const vinSchema = z
  .string()
  .trim()
  .length(17, 'VIN must be exactly 17 characters')
  .regex(/^[A-HJ-NPR-Z0-9]+$/i, 'VIN contains invalid characters');

export const vehicleSchema = z.object({
  vin: vinSchema,
  make: z.string().min(1),
  model: z.string().min(1),
  year: z
    .number()
    .int()
    .gte(1900)
    .lte(new Date().getFullYear() + 1),
});

export type Vin = z.infer<typeof vinSchema>;
export type Vehicle = z.infer<typeof vehicleSchema>;
