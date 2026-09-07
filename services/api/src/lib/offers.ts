import { formatCurrency } from './valuation';

/** "Sep 5" — matches the audit trail mock's abbreviated expiry date. */
export function formatShortDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

interface OfferLike {
  version: number;
  amount: number;
  expiresAt: Date;
}

export function buildOfferSentDetail(offer: OfferLike): string {
  return `v${offer.version} · ${formatCurrency(offer.amount)} · expires ${formatShortDate(offer.expiresAt)}`;
}

export function buildOfferAcceptedDetail(offer: OfferLike): string {
  return `Accepted offer v${offer.version} · ${formatCurrency(offer.amount)}`;
}

export function buildOfferDeclinedDetail(offer: OfferLike): string {
  return `Declined offer v${offer.version} · ${formatCurrency(offer.amount)}`;
}

export function buildOfferCounteredDetail(previous: OfferLike, next: OfferLike): string {
  return `Countered v${previous.version} (${formatCurrency(previous.amount)}) with v${next.version} · ${formatCurrency(next.amount)}`;
}
