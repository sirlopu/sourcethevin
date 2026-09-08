import { describe, expect, it } from 'vitest';
import { inviteUserSchema } from './admin';

describe('inviteUserSchema', () => {
  it('allows a seller invitation without a dealership name or license number', () => {
    const result = inviteUserSchema.safeParse({
      email: 'seller@example.com',
      role: 'seller',
      dealership: { phone: '555-0100' },
    });

    expect(result.success).toBe(true);
  });

  it('omits blank optional dealership fields', () => {
    const result = inviteUserSchema.parse({
      email: 'seller@example.com',
      role: 'seller',
      dealership: { name: '   ', licenseNumber: '', phone: '555-0100' },
    });

    expect(result.dealership).toEqual({ phone: '555-0100' });
  });

  it('continues to require a phone number for seller invitations', () => {
    const result = inviteUserSchema.safeParse({
      email: 'seller@example.com',
      role: 'seller',
      dealership: {},
    });

    expect(result.success).toBe(false);
  });
});
