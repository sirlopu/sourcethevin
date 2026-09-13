import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../lib/api';
import { useAuth } from '../lib/auth-context';
import { getMessages, sendMessage, type MessageRecord } from '../lib/messages-api';

function authorLabel(author: MessageRecord['author']): string {
  if (!author) return 'Unknown';
  const roleLabel =
    author.role === 'trade_desk' ? 'Trade Desk' : author.role === 'seller' ? 'Seller' : 'Admin';
  return `${author.email} (${roleLabel})`;
}

export default function MessageThread({
  submissionId,
  currentUserRole,
}: {
  submissionId: string;
  currentUserRole: string;
}) {
  const { authFetch } = useAuth();
  const [messages, setMessages] = useState<MessageRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const result = await getMessages(authFetch, submissionId);
      setMessages(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load messages.');
    }
  }, [authFetch, submissionId]);

  useEffect(() => {
    // setState here happens after an await inside refresh(), not synchronously in the effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  async function handleSend() {
    if (!body.trim()) return;
    setSending(true);
    setError(null);
    try {
      await sendMessage(authFetch, submissionId, { body });
      setBody('');
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to send your message.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="rounded-xl bg-white p-6 shadow-[0_12px_32px_rgba(10,31,82,.14)]">
      <h2 className="font-display text-lg font-bold text-navy-900">Messages</h2>
      <p className="text-xs text-ink-500">Kept as history for this trade only.</p>

      {error && (
        <p role="alert" className="mt-3 text-sm font-medium text-danger">
          {error}
        </p>
      )}
      {!error && !messages && <p className="mt-3 text-sm text-ink-500">Loading…</p>}
      {messages && messages.length === 0 && (
        <p className="mt-3 text-sm text-ink-500">No messages yet.</p>
      )}

      {messages && messages.length > 0 && (
        <div className="mt-3 max-h-80 space-y-3 overflow-y-auto">
          {messages.map((message) => (
            <div key={message._id} className="rounded-md bg-ink-50 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-ink-700">
                  {authorLabel(message.author)}
                </span>
                <span className="text-[11px] text-ink-500">
                  {new Date(message.createdAt).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm text-ink-900">{message.body}</p>
            </div>
          ))}
        </div>
      )}

      {currentUserRole !== 'admin' && (
        <div className="mt-4 space-y-2">
          <textarea
            rows={3}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Write a message…"
            className="w-full rounded-md border-[1.5px] border-ink-300 px-2 py-1.5 text-sm outline-none focus:border-blue-500"
          />
          <button
            type="button"
            disabled={sending || !body.trim()}
            onClick={() => {
              void handleSend();
            }}
            className="w-full rounded-md bg-navy-900 py-2 text-sm font-semibold text-white hover:bg-navy-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sending ? 'Sending…' : 'Send'}
          </button>
        </div>
      )}
    </div>
  );
}
