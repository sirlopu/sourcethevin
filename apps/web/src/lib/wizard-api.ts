import type {
  Condition,
  Payoff,
  PhotoSlot,
  SubmissionPatch,
  VehicleInfo,
  VinDecodeResult,
} from '@sourcethevin/shared';
import { ApiError } from './api';
import type { AuthFetch } from './auth-context';
import { parseJson } from './http';

export interface SubmissionPhoto {
  slot: PhotoSlot;
  url: string;
  publicId: string;
  uploadedAt: string;
}

export interface SubmissionRecord {
  _id: string;
  referenceId: string;
  status: 'new' | 'submitted' | 'offer_sent' | 'accepted' | 'declined';
  currentStep: number;
  vin?: string;
  decoded?: {
    year: number | null;
    make: string | null;
    model: string | null;
    trim: string | null;
    drivetrain: string | null;
    engine: string | null;
  } | null;
  vehicle: Partial<VehicleInfo>;
  condition: Partial<Condition> & { cosmeticIssues: string[] };
  payoff: Partial<Payoff>;
  photos: SubmissionPhoto[];
  submittedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export function decodeVin(authFetch: AuthFetch, vin: string) {
  return parseJson<VinDecodeResult & { cached: boolean }>(authFetch(`/vin/${vin}/decode`));
}

export function createSubmission(authFetch: AuthFetch) {
  return parseJson<SubmissionRecord>(authFetch('/submissions', { method: 'POST' }));
}

export function getSubmission(authFetch: AuthFetch, id: string) {
  return parseJson<SubmissionRecord>(authFetch(`/submissions/${id}`));
}

export function patchSubmission(authFetch: AuthFetch, id: string, patch: SubmissionPatch) {
  return parseJson<SubmissionRecord>(
    authFetch(`/submissions/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  );
}

export interface SignedPhotoUpload {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  publicId: string;
  overwrite: true;
  signature: string;
  uploadUrl: string;
}

export function signPhotoUpload(authFetch: AuthFetch, id: string, slot: PhotoSlot) {
  return parseJson<SignedPhotoUpload>(
    authFetch(`/submissions/${id}/photos/sign`, { method: 'POST', body: JSON.stringify({ slot }) }),
  );
}

export function confirmPhotoUpload(
  authFetch: AuthFetch,
  id: string,
  payload: { slot: PhotoSlot; publicId: string; url: string },
) {
  return parseJson<SubmissionRecord>(
    authFetch(`/submissions/${id}/photos`, { method: 'POST', body: JSON.stringify(payload) }),
  );
}

export function submitSubmission(authFetch: AuthFetch, id: string) {
  return parseJson<SubmissionRecord>(authFetch(`/submissions/${id}/submit`, { method: 'POST' }));
}

export async function uploadToCloudinary(
  file: Blob,
  signed: SignedPhotoUpload,
): Promise<{ secure_url: string }> {
  const form = new FormData();
  form.append('file', file);
  form.append('api_key', signed.apiKey);
  form.append('timestamp', String(signed.timestamp));
  form.append('public_id', signed.publicId);
  form.append('overwrite', 'true');
  form.append('signature', signed.signature);

  const response = await fetch(signed.uploadUrl, { method: 'POST', body: form });
  const body: unknown = await response.json().catch(() => undefined);
  if (!response.ok) {
    throw new ApiError(response.status, 'Photo upload failed. Please try again.');
  }
  return body as { secure_url: string };
}
