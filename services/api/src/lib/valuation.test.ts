import { describe, expect, it } from 'vitest';
import { computeRecommendedMaxAcquisition, formatCurrency } from './valuation';

describe('computeRecommendedMaxAcquisition', () => {
  it('computes max(bidReferences) - sum(estimatedExpenses) - targetMargin', () => {
    const result = computeRecommendedMaxAcquisition(
      [
        { source: 'CarMax', amount: 7200 },
        { source: 'GiveMeTheVIN', amount: 7050 },
        { source: 'Wholesale', amount: 7400 },
      ],
      { transport: 150, recon: 600, arbitrationCondition: 200, other: 0 },
      1000,
    );
    expect(result).toBe(7400 - 950 - 1000);
  });

  it('returns a negative number when expenses and margin exceed the best bid', () => {
    const result = computeRecommendedMaxAcquisition(
      [{ source: 'CarMax', amount: 1000 }],
      { transport: 500, recon: 500, arbitrationCondition: 0, other: 0 },
      500,
    );
    expect(result).toBe(-500);
  });

  it('treats an empty bid list as a max bid of 0', () => {
    const result = computeRecommendedMaxAcquisition(
      [],
      { transport: 100, recon: 0, arbitrationCondition: 0, other: 0 },
      0,
    );
    expect(result).toBe(-100);
  });

  it('ignores any pre-existing computed field on the input and always recomputes', () => {
    const a = computeRecommendedMaxAcquisition(
      [{ source: 'A', amount: 5000 }],
      { transport: 0, recon: 0, arbitrationCondition: 0, other: 0 },
      0,
    );
    const b = computeRecommendedMaxAcquisition(
      [{ source: 'A', amount: 5000, loggedAt: new Date().toISOString() }],
      { transport: 0, recon: 0, arbitrationCondition: 0, other: 0 },
      0,
    );
    expect(a).toBe(5000);
    expect(b).toBe(5000);
  });
});

describe('formatCurrency', () => {
  it('formats with a dollar sign and thousands separators', () => {
    expect(formatCurrency(5450)).toBe('$5,450');
    expect(formatCurrency(0)).toBe('$0');
    expect(formatCurrency(-500)).toBe('-$500');
  });
});
