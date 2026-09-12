import { z } from 'zod';

export const registerSellerRequestSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(10),
  dealership: z.object({
    name: z.string().trim().min(1),
    licenseNumber: z.string().trim().min(1),
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
