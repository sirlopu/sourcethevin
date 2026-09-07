import { describe, expect, it } from 'vitest';
import { vehicleSchema, vinSchema } from './vehicle';

describe('vinSchema', () => {
  it('accepts a valid 17-character VIN', () => {
    expect(vinSchema.parse('1HGCM82633A004352')).toBe('1HGCM82633A004352');
  });

  it('rejects a VIN with the wrong length', () => {
    expect(() => vinSchema.parse('SHORTVIN')).toThrow();
  });

  it('rejects a VIN containing excluded characters', () => {
    expect(() => vinSchema.parse('1HGCM82633AOOI352')).toThrow();
  });
});

describe('vehicleSchema', () => {
  it('accepts a valid vehicle', () => {
    const result = vehicleSchema.parse({
      vin: '1HGCM82633A004352',
      make: 'Honda',
      model: 'Accord',
      year: 2003,
    });
    expect(result.make).toBe('Honda');
  });
});
