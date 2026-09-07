import type {
  OfferCreateInput,
  OfferCounterInput,
  OfferCreatorRole,
  OfferStatus,
} from '@sourcethevin/shared';
import type { AuthFetch } from './auth-context';
import { parseJson } from './http';

export interface OfferRecord {
  _id: string;
  submissionId: string;
  version: number;
  amount: number;
  expiresAt: string;
  terms: string;
  notes: string;
  status: OfferStatus;
  createdByRole: OfferCreatorRole;
  createdBy: string;
  respondedAt?: string;
  respondedBy?: string;
  createdAt: string;
}

export interface AuditLogEntry {
  _id: string;
  action: string;
  detail: string;
  createdAt: string;
  actor: { email: string; role: string } | null;
}

export function createOffer(authFetch: AuthFetch, submissionId: string, input: OfferCreateInput) {
  return parseJson<OfferRecord>(
    authFetch(`/submissions/${submissionId}/offers`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  );
}

export async function getLatestOffer(
  authFetch: AuthFetch,
  submissionId: string,
): Promise<OfferRecord | null> {
  const response = await authFetch(`/submissions/${submissionId}/offers/latest`);
  if (response.status === 404) return null;
  return parseJson<OfferRecord>(Promise.resolve(response));
}

export function acceptOffer(authFetch: AuthFetch, offerId: string) {
  return parseJson<OfferRecord>(authFetch(`/offers/${offerId}/accept`, { method: 'POST' }));
}

export function declineOffer(authFetch: AuthFetch, offerId: string) {
  return parseJson<OfferRecord>(authFetch(`/offers/${offerId}/decline`, { method: 'POST' }));
}

export function counterOffer(authFetch: AuthFetch, offerId: string, input: OfferCounterInput) {
  return parseJson<OfferRecord>(
    authFetch(`/offers/${offerId}/counter`, { method: 'POST', body: JSON.stringify(input) }),
  );
}

export function getAuditTrail(authFetch: AuthFetch, submissionId: string) {
  return parseJson<AuditLogEntry[]>(authFetch(`/submissions/${submissionId}/audit`));
}
