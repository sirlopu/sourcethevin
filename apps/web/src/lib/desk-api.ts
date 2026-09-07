import type { ValuationInput } from '@sourcethevin/shared';
import type { AuthFetch } from './auth-context';
import { parseJson } from './http';
import type { SubmissionRecord } from './wizard-api';

export interface BidReference {
  source: string;
  amount: number;
  loggedAt: string;
}

export interface EstimatedExpenses {
  transport: number;
  recon: number;
  arbitrationCondition: number;
  other: number;
}

export interface BuyerOverride {
  amount: number;
  reason: string;
  loggedBy: string;
  loggedAt: string;
}

export interface ValuationRecord {
  submissionId: string;
  tenantId: string;
  bidReferences: BidReference[];
  estimatedExpenses: EstimatedExpenses;
  targetMargin: number;
  recommendedMaxAcquisition: number;
  buyerOverride: BuyerOverride | null;
  internalNotes: string;
}

export interface SellerInfo {
  id: string;
  email: string;
  dealershipName: string | null;
}

export interface SubmissionListItem extends SubmissionRecord {
  seller?: SellerInfo | null;
  valuation?: ValuationRecord | null;
}

export interface SubmissionListResponse {
  items: SubmissionListItem[];
  total: number;
  page: number;
  limit: number;
}

export interface ListSubmissionsParams {
  status?: 'new' | 'submitted';
  seller?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export function listSubmissions(authFetch: AuthFetch, params: ListSubmissionsParams = {}) {
  const query = new URLSearchParams();
  if (params.status) query.set('status', params.status);
  if (params.seller) query.set('seller', params.seller);
  if (params.dateFrom) query.set('dateFrom', params.dateFrom);
  if (params.dateTo) query.set('dateTo', params.dateTo);
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  const qs = query.toString();
  return parseJson<SubmissionListResponse>(authFetch(`/submissions${qs ? `?${qs}` : ''}`));
}

export function getSubmissionDetail(authFetch: AuthFetch, id: string) {
  return parseJson<SubmissionListItem>(authFetch(`/submissions/${id}`));
}

export function getValuation(authFetch: AuthFetch, submissionId: string) {
  return parseJson<ValuationRecord>(authFetch(`/submissions/${submissionId}/valuation`));
}

export function saveValuation(authFetch: AuthFetch, submissionId: string, input: ValuationInput) {
  return parseJson<ValuationRecord>(
    authFetch(`/submissions/${submissionId}/valuation`, {
      method: 'PUT',
      body: JSON.stringify(input),
    }),
  );
}

export function overrideValuation(
  authFetch: AuthFetch,
  submissionId: string,
  input: { amount: number; reason: string },
) {
  return parseJson<ValuationRecord>(
    authFetch(`/submissions/${submissionId}/valuation/override`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  );
}
