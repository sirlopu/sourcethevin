import { describe, expect, it } from 'vitest';
import { changePasswordSchema, registerSellerRequestSchema } from './auth';

describe('registerSellerRequestSchema', () => {
  it('accepts names and dealership details without a password', () => {
    const result = registerSellerRequestSchema.safeParse({
      email: 'seller@example.com',
      firstName: 'Sam',
      lastName: 'Seller',
      dealership: { name: 'Example Motors', phone: '555-0100' },
    });

    expect(result.success).toBe(true);
  });

  it('trims names and dealership name and omits a blank license number', () => {
    const result = registerSellerRequestSchema.parse({
      email: 'seller@example.com',
      firstName: ' Sam ',
      lastName: ' Seller ',
      dealership: { name: ' Example Motors ', licenseNumber: '', phone: '555-0100' },
    });

    expect(result).toEqual({
      email: 'seller@example.com',
      firstName: 'Sam',
      lastName: 'Seller',
      dealership: { name: 'Example Motors', phone: '555-0100' },
    });
  });

  it('requires names, dealership name, and phone number', () => {
    const result = registerSellerRequestSchema.safeParse({
      email: 'seller@example.com',
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
