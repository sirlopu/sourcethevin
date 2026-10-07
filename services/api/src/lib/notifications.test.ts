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
import {
  getAdminRecipients,
  getDeskRecipients,
  getSeller,
  getSellerRequestRecipients,
  notify,
  notifySellerRequestApproved,
} from './notifications';

beforeEach(() => {
  vi.mocked(Notification.insertMany)
    .mockReset()
    .mockResolvedValue([] as never);
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
        { _id: 'u1', email: 'seller@example.com', role: 'seller' },
        { _id: 'u2', email: 'desk@example.com', role: 'trade_desk' },
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

  it('excludes admins from every notification type except seller requests', async () => {
    await notify({
      tenantId: 't1',
      type: 'submission_submitted',
      recipients: [
        { _id: 'admin-1', email: 'admin@example.com', role: 'admin' },
        { _id: 'desk-1', email: 'desk@example.com', role: 'trade_desk' },
      ],
      title: 'New trade submitted',
      body: 'A trade is ready for review.',
    });

    expect(Notification.insertMany).toHaveBeenCalledWith([
      expect.objectContaining({ recipientId: 'desk-1', type: 'submission_submitted' }),
    ]);
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'desk@example.com' }),
    );
  });

  it.each([
    'seller_request_received',
    'seller_request_approved',
    'user_role_changed',
    'user_status_changed',
  ] as const)(
    'allows admins to receive %s',
    async (type) => {
      await notify({
        tenantId: 't1',
        type,
        recipients: [{ _id: 'admin-1', email: 'admin@example.com', role: 'admin' }],
        title: 'Seller request',
        body: 'Seller request update.',
      });

      expect(Notification.insertMany).toHaveBeenCalledWith([
        expect.objectContaining({ recipientId: 'admin-1', type }),
      ]);
      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'admin@example.com' }),
      );
    },
  );
});

describe('getDeskRecipients', () => {
  it('queries only trade-desk users in the tenant', async () => {
    vi.mocked(User.find).mockResolvedValue([] as never);

    await getDeskRecipients('tenant-1');

    expect(User.find).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      role: 'trade_desk',
    });
  });
});

describe('getAdminRecipients', () => {
  it('queries only admin users in the tenant', async () => {
    vi.mocked(User.find).mockResolvedValue([] as never);

    await getAdminRecipients('tenant-1');

    expect(User.find).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      role: 'admin',
    });
  });
});

describe('getSellerRequestRecipients', () => {
  it('combines tenant trade-desk and admin users', async () => {
    const deskUser = { _id: 'desk-1', email: 'desk@example.com', role: 'trade_desk' };
    const adminUser = { _id: 'admin-1', email: 'admin@example.com', role: 'admin' };
    vi.mocked(User.find)
      .mockResolvedValueOnce([deskUser] as never)
      .mockResolvedValueOnce([adminUser] as never);

    const recipients = await getSellerRequestRecipients('tenant-1');

    expect(User.find).toHaveBeenNthCalledWith(1, { tenantId: 'tenant-1', role: 'trade_desk' });
    expect(User.find).toHaveBeenNthCalledWith(2, { tenantId: 'tenant-1', role: 'admin' });
    expect(recipients).toEqual([deskUser, adminUser]);
  });
});

describe('notifySellerRequestApproved', () => {
  it('sends role-appropriate approval notifications to the seller and tenant admins', async () => {
    const seller = {
      _id: 'seller-1',
      email: 'seller@example.com',
      role: 'seller',
      tenantId: 'tenant-1',
    };
    const admin = { _id: 'admin-1', email: 'admin@example.com', role: 'admin' };
    vi.mocked(User.find).mockResolvedValue([admin] as never);

    await notifySellerRequestApproved(seller as never);

    expect(User.find).toHaveBeenCalledWith({ tenantId: 'tenant-1', role: 'admin' });
    expect(Notification.insertMany).toHaveBeenNthCalledWith(1, [
      expect.objectContaining({
        recipientId: 'seller-1',
        type: 'seller_request_approved',
        title: 'Your account was approved',
        body: 'Your seller account was approved. You can now sign in.',
      }),
    ]);
    expect(Notification.insertMany).toHaveBeenNthCalledWith(2, [
      expect.objectContaining({
        recipientId: 'admin-1',
        type: 'seller_request_approved',
        title: 'Seller account approved',
        body: 'seller@example.com was approved. They can now sign in.',
      }),
    ]);
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
