import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../models/Notification', () => ({
  Notification: { insertMany: vi.fn() },
}));
vi.mock('../models/User', () => ({
  User: { find: vi.fn(), findById: vi.fn() },
}));
vi.mock('./email', () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
  buildEmailHtml: vi.fn((title: string, body: string) => `<p>${title}: ${body}</p>`),
}));

import { Notification } from '../models/Notification';
import { User } from '../models/User';
import { sendEmail } from './email';
import { getDeskRecipients, getSeller, notify } from './notifications';

beforeEach(() => {
  vi.mocked(Notification.insertMany).mockReset().mockResolvedValue([] as never);
  vi.mocked(sendEmail).mockClear();
  vi.mocked(User.find).mockReset();
  vi.mocked(User.findById).mockReset();
});

describe('notify', () => {
  it('does nothing when there are no recipients', async () => {
    await notify({
      tenantId: 't1',
      type: 'offer_sent',
      recipients: [],
      title: 'Hi',
      body: 'Body',
    });

    expect(Notification.insertMany).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('creates one Notification per recipient and emails each one', async () => {
    await notify({
      tenantId: 't1',
      submissionId: 's1',
      type: 'offer_sent',
      recipients: [
        { _id: 'u1', email: 'seller@example.com' },
        { _id: 'u2', email: 'desk@example.com' },
      ],
      title: 'You have a new offer',
      body: 'A new offer was sent.',
      link: '/submissions/s1',
    });

    expect(Notification.insertMany).toHaveBeenCalledWith([
      expect.objectContaining({ recipientId: 'u1', type: 'offer_sent', tenantId: 't1' }),
      expect.objectContaining({ recipientId: 'u2', type: 'offer_sent', tenantId: 't1' }),
    ]);

    await vi.waitFor(() => expect(sendEmail).toHaveBeenCalledTimes(2));
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'seller@example.com', subject: 'You have a new offer' }),
    );
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'desk@example.com', subject: 'You have a new offer' }),
    );
  });
});

describe('getDeskRecipients', () => {
  it('queries trade_desk and admin users in the tenant', async () => {
    vi.mocked(User.find).mockResolvedValue([] as never);

    await getDeskRecipients('tenant-1');

    expect(User.find).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      role: { $in: ['trade_desk', 'admin'] },
    });
  });
});

describe('getSeller', () => {
  it('looks up the submission owner by sellerId', async () => {
    vi.mocked(User.findById).mockResolvedValue({ email: 'seller@example.com' } as never);

    const seller = await getSeller({ sellerId: 'seller-1' } as never);

    expect(User.findById).toHaveBeenCalledWith('seller-1');
    expect(seller).toEqual({ email: 'seller@example.com' });
  });
});
