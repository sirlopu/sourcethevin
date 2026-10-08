import { z } from 'zod';

const optionalTrimmedString = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().trim().min(1).optional(),
);

export const registerSellerRequestSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(10),
  dealership: z.object({
    name: optionalTrimmedString,
    licenseNumber: optionalTrimmedString,
    phone: z.string().trim().min(1),
  }),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(10),
});
