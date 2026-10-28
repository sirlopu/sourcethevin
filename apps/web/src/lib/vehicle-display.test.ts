import { describe, expect, it } from 'vitest';
import { formatVehicleMake, vehicleLabel } from './vehicle-display';

describe('formatVehicleMake', () => {
  it.each([
    ['bmw', 'BMW'],
    ['fiat', 'FIAT'],
    ['gmc', 'GMC'],
    ['mini', 'MINI'],
    ['ram', 'RAM'],
  ])('formats %s as %s', (make, expected) => {
    expect(formatVehicleMake(make)).toBe(expected);
  });

  it('title-cases other makes and handles missing values', () => {
    expect(formatVehicleMake('hONDA')).toBe('Honda');
    expect(formatVehicleMake('  ')).toBe('');
    expect(formatVehicleMake(null)).toBe('');
  });
});

describe('vehicleLabel', () => {
  it('formats the make in a complete vehicle label', () => {
    expect(vehicleLabel({ year: 2021, make: 'mini', model: 'Cooper' })).toBe('2021 MINI Cooper');
  });

  it('uses the supplied fallback when vehicle fields are empty', () => {
    expect(vehicleLabel({}, 'Untitled trade-in')).toBe('Untitled trade-in');
  });
});
