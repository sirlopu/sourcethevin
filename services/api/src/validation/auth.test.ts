import { describe, expect, it } from 'vitest';
import { changePasswordSchema } from './auth';

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
