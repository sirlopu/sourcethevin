import { ApiError } from './api';

export async function parseJson<T>(responsePromise: Promise<Response>): Promise<T> {
  const response = await responsePromise;
  const body: unknown = await response.json().catch(() => undefined);
  if (!response.ok) {
    const message =
      body && typeof body === 'object' && 'error' in body && typeof body.error === 'string'
        ? body.error
        : 'Something went wrong. Please try again.';
    throw new ApiError(response.status, message);
  }
  return body as T;
}
