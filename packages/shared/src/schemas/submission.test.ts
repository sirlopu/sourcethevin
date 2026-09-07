import { describe, expect, it } from 'vitest';
import { submissionCreateSchema } from './submission';

const decoded = {
  year: 2003,
  make: 'Honda',
  model: 'Accord',
  trim: null,
  drivetrain: null,
  engine: null,
};

describe('submissionCreateSchema', () => {
  it('requires a VIN and decoded vehicle data before a draft can be created', () => {
    expect(submissionCreateSchema.safeParse({}).success).toBe(false);
    expect(submissionCreateSchema.safeParse({ vin: '1HGCM82633A004352' }).success).toBe(false);
    expect(submissionCreateSchema.safeParse({ vin: '1HGCM82633A004352', decoded }).success).toBe(
      true,
    );
  });
});
