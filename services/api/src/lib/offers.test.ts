import { describe, expect, it } from 'vitest';
import {
  buildOfferAcceptedDetail,
  buildOfferCounteredDetail,
  buildOfferDeclinedDetail,
  buildOfferSentDetail,
  formatShortDate,
} from './offers';

describe('formatShortDate', () => {
  it('formats as abbreviated month + day', () => {
    expect(formatShortDate(new Date('2026-09-05T17:00:00Z'))).toBe('Sep 5');
  });
});

describe('buildOfferSentDetail', () => {
  it('matches the audit trail mock format exactly', () => {
    const detail = buildOfferSentDetail({
      version: 1,
      amount: 5600,
      expiresAt: new Date('2026-09-05T17:00:00Z'),
    });
    expect(detail).toBe('v1 · $5,600 · expires Sep 5');
  });
});

describe('buildOfferAcceptedDetail', () => {
  it('matches the audit trail mock format exactly', () => {
    const detail = buildOfferAcceptedDetail({
      version: 1,
      amount: 5600,
      expiresAt: new Date('2026-09-05T17:00:00Z'),
    });
    expect(detail).toBe('Accepted offer v1 · $5,600');
  });
});

describe('buildOfferDeclinedDetail', () => {
  it('mirrors the accepted format', () => {
    const detail = buildOfferDeclinedDetail({
      version: 2,
      amount: 4900,
      expiresAt: new Date('2026-09-05T17:00:00Z'),
    });
    expect(detail).toBe('Declined offer v2 · $4,900');
  });
});

describe('buildOfferCounteredDetail', () => {
  it('describes both the superseded and new offer', () => {
    const detail = buildOfferCounteredDetail(
      { version: 1, amount: 5600, expiresAt: new Date() },
      { version: 2, amount: 5200, expiresAt: new Date() },
    );
    expect(detail).toBe('Countered v1 ($5,600) with v2 · $5,200');
  });
});
