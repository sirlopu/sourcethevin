import { describe, expect, it } from 'vitest';
import { changePasswordSchema, registerSellerRequestSchema } from './auth';

describe('registerSellerRequestSchema', () => {
  it('accepts omitted dealership name and license number', () => {
    const result = registerSellerRequestSchema.safeParse({
      email: 'seller@example.com',
      password: 'a-long-enough-password',
      dealership: { phone: '555-0100' },
    });

    expect(result.success).toBe(true);
  });

  it('normalizes blank dealership name and license number to omitted fields', () => {
    const result = registerSellerRequestSchema.parse({
      email: 'seller@example.com',
      password: 'a-long-enough-password',
      dealership: { name: '   ', licenseNumber: '', phone: '555-0100' },
    });

    expect(result.dealership).toEqual({ phone: '555-0100' });
  });

  it('continues to require a phone number', () => {
    const result = registerSellerRequestSchema.safeParse({
      email: 'seller@example.com',
      password: 'a-long-enough-password',
      dealership: {},
    });

    expect(result.success).toBe(false);
  });
});

describe('changePasswordSchema', () => {
  it('accepts a current password and a new password of at least 10 characters', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'temp-password',
      newPassword: 'a-new-password',
    });

    expect(result.success).toBe(true);
  });

  it('rejects a new password shorter than 10 characters', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'temp-password',
      newPassword: 'short',
    });

    expect(result.success).toBe(false);
  });

  it('rejects a missing current password', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: '',
      newPassword: 'a-new-password',
    });

    expect(result.success).toBe(false);
  });
});
