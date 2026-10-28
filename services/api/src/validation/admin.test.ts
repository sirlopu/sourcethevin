import { describe, expect, it } from 'vitest';
import { inviteUserSchema } from './admin';

describe('inviteUserSchema', () => {
  it('allows a seller invitation without a dealership name or license number', () => {
    const result = inviteUserSchema.safeParse({
      firstName: 'Seller',
      lastName: 'User',
      email: 'seller@example.com',
      role: 'seller',
      dealership: { phone: '555-0100' },
    });

    expect(result.success).toBe(true);
  });

  it('omits blank optional dealership fields', () => {
    const result = inviteUserSchema.parse({
      firstName: ' Seller ',
      lastName: ' User ',
      email: 'seller@example.com',
      role: 'seller',
      dealership: { name: '   ', licenseNumber: '', phone: '555-0100' },
    });

    expect(result.dealership).toEqual({ phone: '555-0100' });
    expect(result.firstName).toBe('Seller');
    expect(result.lastName).toBe('User');
  });

  it('continues to require a phone number for seller invitations', () => {
    const result = inviteUserSchema.safeParse({
      firstName: 'Seller',
      lastName: 'User',
      email: 'seller@example.com',
      role: 'seller',
      dealership: {},
    });

    expect(result.success).toBe(false);
  });

  it('requires non-blank first and last names for every role', () => {
    for (const field of ['firstName', 'lastName'] as const) {
      const missing = inviteUserSchema.safeParse({
        ...(field === 'firstName' ? {} : { firstName: 'Trade' }),
        ...(field === 'lastName' ? {} : { lastName: 'Desk' }),
        email: 'desk@example.com',
        role: 'trade_desk',
      });
      const blank = inviteUserSchema.safeParse({
        firstName: 'Trade',
        lastName: 'Desk',
        email: 'desk@example.com',
        role: 'trade_desk',
        [field]: '   ',
      });

      expect(missing.success).toBe(false);
      expect(blank.success).toBe(false);
    }
  });

  it('accepts and trims names on a Trade Desk invitation', () => {
    const result = inviteUserSchema.parse({
      firstName: ' Trade ',
      lastName: ' Desk ',
      email: 'desk@example.com',
      role: 'trade_desk',
    });

    expect(result.firstName).toBe('Trade');
    expect(result.lastName).toBe('Desk');
  });
});
