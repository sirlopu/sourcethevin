import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const sendMock = vi.fn();

vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(function Resend(this: { emails: unknown }) {
    this.emails = { send: sendMock };
  }),
}));

describe('sendEmail', () => {
  const originalApiKey = process.env.RESEND_API_KEY;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.resetModules();
    sendMock.mockReset();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env.RESEND_API_KEY = originalApiKey;
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('logs instead of sending when RESEND_API_KEY is unset', async () => {
    delete process.env.RESEND_API_KEY;
    const { sendEmail } = await import('./email');

    await sendEmail({ to: 'a@example.com', subject: 'Hi', html: '<p>hi</p>', text: 'hi' });

    expect(sendMock).not.toHaveBeenCalled();
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('a@example.com'));
  });

  it('sends via Resend when RESEND_API_KEY is set', async () => {
    process.env.RESEND_API_KEY = 'test-key';
    const { sendEmail } = await import('./email');

    await sendEmail({ to: 'a@example.com', subject: 'Hi', html: '<p>hi</p>', text: 'hi' });

    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'a@example.com', subject: 'Hi' }),
    );
  });

  it('logs an error instead of throwing when Resend fails', async () => {
    process.env.RESEND_API_KEY = 'test-key';
    sendMock.mockRejectedValue(new Error('boom'));
    const { sendEmail } = await import('./email');

    await expect(
      sendEmail({ to: 'a@example.com', subject: 'Hi', html: '<p>hi</p>', text: 'hi' }),
    ).resolves.toBeUndefined();
    expect(consoleErrorSpy).toHaveBeenCalled();
  });
});
