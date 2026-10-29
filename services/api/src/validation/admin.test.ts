import { describe, expect, it } from 'vitest';
import { inviteUserSchema, updateUserProfileSchema } from './admin';

describe('inviteUserSchema', () => {
  it('allows a seller invitation without a license number', () => {
    const result = inviteUserSchema.safeParse({
      firstName: 'Seller',
      lastName: 'User',
      email: 'seller@example.com',
      role: 'seller',
      dealership: { name: 'Acme Motors', phone: '555-0100' },
    });

    expect(result.success).toBe(true);
  });

  it('requires a non-blank dealership name for seller invitations', () => {
    for (const dealership of [{ phone: '555-0100' }, { name: '   ', phone: '555-0100' }]) {
      const result = inviteUserSchema.safeParse({
        firstName: 'Seller',
        lastName: 'User',
        email: 'seller@example.com',
        role: 'seller',
        dealership,
      });

      expect(result.success).toBe(false);
    }
  });

  it('trims the dealership name and omits a blank license number', () => {
    const result = inviteUserSchema.parse({
      firstName: ' Seller ',
      lastName: ' User ',
      email: 'seller@example.com',
      role: 'seller',
      dealership: { name: ' Acme Motors ', licenseNumber: '', phone: '555-0100' },
    });

    expect(result.dealership).toEqual({ name: 'Acme Motors', phone: '555-0100' });
    expect(result.firstName).toBe('Seller');
    expect(result.lastName).toBe('User');
  });

  it('continues to require a phone number for seller invitations', () => {
    const result = inviteUserSchema.safeParse({
      firstName: 'Seller',
      lastName: 'User',
      email: 'seller@example.com',
      role: 'seller',
      dealership: { name: 'Acme Motors' },
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

describe('updateUserProfileSchema', () => {
  it('trims names and dealership fields and omits a blank license number', () => {
    const result = updateUserProfileSchema.parse({
      firstName: ' Pat ',
      lastName: ' Lee ',
      dealership: { name: ' Acme Motors ', licenseNumber: '  ' },
    });

    expect(result).toEqual({
      firstName: 'Pat',
      lastName: 'Lee',
      dealership: { name: 'Acme Motors' },
    });
  });

  it('allows updating names without dealership details', () => {
    expect(updateUserProfileSchema.safeParse({ firstName: 'Pat', lastName: 'Lee' }).success).toBe(
      true,
    );
  });

  it('rejects blank names and a blank dealership name', () => {
    expect(updateUserProfileSchema.safeParse({ firstName: ' ', lastName: 'Lee' }).success).toBe(
      false,
    );
    expect(updateUserProfileSchema.safeParse({ firstName: 'Pat', lastName: '' }).success).toBe(
      false,
    );
    expect(
      updateUserProfileSchema.safeParse({
        firstName: 'Pat',
        lastName: 'Lee',
        dealership: { name: '  ' },
      }).success,
    ).toBe(false);
  });
});
