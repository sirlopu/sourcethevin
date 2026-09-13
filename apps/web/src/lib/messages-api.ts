import type { MessageCreateInput } from '@sourcethevin/shared';
import type { AuthFetch } from './auth-context';
import { parseJson } from './http';

export interface MessageRecord {
  _id: string;
  body: string;
  createdAt: string;
  author: { email: string; role: string } | null;
}

export function getMessages(authFetch: AuthFetch, submissionId: string) {
  return parseJson<MessageRecord[]>(authFetch(`/submissions/${submissionId}/messages`));
}

export function sendMessage(authFetch: AuthFetch, submissionId: string, input: MessageCreateInput) {
  return parseJson<MessageRecord>(
    authFetch(`/submissions/${submissionId}/messages`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  );
}
