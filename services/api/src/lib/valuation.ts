import type { BidReferenceInput, EstimatedExpenses } from '@sourcethevin/shared';

/** max(bidReferences) - sum(estimatedExpenses) - targetMargin. Always computed server-side. */
export function computeRecommendedMaxAcquisition(
  bidReferences: BidReferenceInput[],
  estimatedExpenses: EstimatedExpenses,
  targetMargin: number,
): number {
  const maxBid = bidReferences.length > 0 ? Math.max(...bidReferences.map((bid) => bid.amount)) : 0;
  const totalExpenses =
    estimatedExpenses.transport +
    estimatedExpenses.recon +
    estimatedExpenses.arbitrationCondition +
    estimatedExpenses.other;
  return maxBid - totalExpenses - targetMargin;
}

export function formatCurrency(amount: number): string {
  const sign = amount < 0 ? '-' : '';
  return `${sign}$${Math.abs(amount).toLocaleString('en-US')}`;
}
