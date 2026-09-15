import { Resend } from 'resend';

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

let cachedClient: Resend | null | undefined;

function getClient(): Resend | null {
  if (cachedClient !== undefined) return cachedClient;
  const apiKey = process.env.RESEND_API_KEY;
  cachedClient = apiKey ? new Resend(apiKey) : null;
  return cachedClient;
}

/** Wraps plain body text in a minimal HTML shell shared by every notification email. */
export function buildEmailHtml(title: string, bodyText: string): string {
  const escaped = bodyText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<div style="font-family: sans-serif; font-size: 15px; color: #1a1a1a;">
  <h2 style="margin: 0 0 12px;">${title}</h2>
  <p style="margin: 0; white-space: pre-line;">${escaped}</p>
</div>`;
}

/**
 * Sends a transactional email via Resend. When RESEND_API_KEY isn't configured (local dev
 * without a provisioned key), logs the message instead of throwing so the rest of the app
 * keeps working — mirrors how Cloudinary uploads degrade when unconfigured.
 */
export async function sendEmail(message: EmailMessage): Promise<void> {
  const client = getClient();
  if (!client) {
    console.log(`[email:unsent - no RESEND_API_KEY] to=${message.to} subject="${message.subject}"`);
    return;
  }
  const from = process.env.RESEND_FROM_EMAIL ?? 'notifications@sourcethevin.com';
  try {
    await client.emails.send({
      from,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });
  } catch (err) {
    console.error(`[email:failed] to=${message.to} subject="${message.subject}"`, err);
  }
}
