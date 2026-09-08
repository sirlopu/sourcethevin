import { z } from 'zod';
import { USER_ROLES } from '../models/User';

export const inviteUserSchema = z
  .object({
    email: z.string().trim().toLowerCase().email(),
    role: z.enum(USER_ROLES),
    dealership: z
      .object({
        name: z.string().trim().min(1),
        licenseNumber: z.string().trim().min(1),
        phone: z.string().trim().min(1),
      })
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.role === 'seller' && !data.dealership) {
      ctx.addIssue({
        code: 'custom',
        path: ['dealership'],
        message: 'Dealership is required for seller accounts',
      });
    }
    if (data.role !== 'seller' && data.dealership) {
      ctx.addIssue({
        code: 'custom',
        path: ['dealership'],
        message: 'Dealership only applies to seller accounts',
      });
    }
  });
export type InviteUserInput = z.infer<typeof inviteUserSchema>;

export const updateUserRoleSchema = z.object({ role: z.enum(USER_ROLES) });
export const updateUserStatusSchema = z.object({ status: z.enum(['active', 'suspended']) });
