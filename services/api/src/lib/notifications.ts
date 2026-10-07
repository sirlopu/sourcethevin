import type { Types } from 'mongoose';
import { buildEmailHtml, sendEmail } from './email';
import { Notification, type NotificationType } from '../models/Notification';
import { type UserDocument, User } from '../models/User';
import type { SubmissionDocument } from '../models/Submission';

interface RecipientLike {
  _id: Types.ObjectId | string;
  email: string;
  role: UserDocument['role'];
}

const ADMIN_NOTIFICATION_TYPES = new Set<NotificationType>([
  'seller_request_received',
  'seller_request_approved',
  'user_role_changed',
  'user_status_changed',
]);

export interface NotifyParams {
  tenantId: Types.ObjectId | string;
  submissionId?: Types.ObjectId | string;
  type: NotificationType;
  recipients: RecipientLike[];
  title: string;
  body: string;
  link?: string;
}

/**
 * Creates an in-app Notification per recipient and fires the matching email without awaiting
 * delivery — there's no job queue in this stack, so a slow/down email provider must never block
 * the API response.
 */
export async function notify(params: NotifyParams): Promise<void> {
  const { tenantId, submissionId, type, recipients, title, body, link } = params;
  const eligibleRecipients = recipients.filter(
    (recipient) =>
      recipient.role !== 'admin' || ADMIN_NOTIFICATION_TYPES.has(type),
  );
  if (eligibleRecipients.length === 0) return;

  await Notification.insertMany(
    eligibleRecipients.map((recipient) => ({
      tenantId,
      submissionId,
      recipientId: recipient._id,
      type,
      title,
      body,
      link,
    })),
  );

  for (const recipient of eligibleRecipients) {
    void sendEmail({
      to: recipient.email,
      subject: title,
      html: buildEmailHtml(title, body),
      text: body,
    }).catch((err) => console.error(`[notify:email] failed for ${recipient.email}`, err));
  }
}

/** Every trade-desk user in a tenant; queue-facing events have no per-submission assignment. */
export function getDeskRecipients(tenantId: Types.ObjectId | string): Promise<UserDocument[]> {
  return User.find({ tenantId, role: 'trade_desk' });
}

export function getAdminRecipients(tenantId: Types.ObjectId | string): Promise<UserDocument[]> {
  return User.find({ tenantId, role: 'admin' });
}

export async function getSellerRequestRecipients(
  tenantId: Types.ObjectId | string,
): Promise<UserDocument[]> {
  const [deskRecipients, adminRecipients] = await Promise.all([
    getDeskRecipients(tenantId),
    getAdminRecipients(tenantId),
  ]);
  return [...deskRecipients, ...adminRecipients];
}

export async function notifySellerRequestApproved(seller: UserDocument): Promise<void> {
  await notify({
    tenantId: seller.tenantId,
    type: 'seller_request_approved',
    recipients: [seller],
    title: 'Your account was approved',
    body: 'Your seller account was approved. You can now sign in.',
  });

  const admins = await getAdminRecipients(seller.tenantId);
  await notify({
    tenantId: seller.tenantId,
    type: 'seller_request_approved',
    recipients: admins,
    title: 'Seller account approved',
    body: `${seller.email} was approved. They can now sign in.`,
  });
}

export async function getSeller(
  submission: Pick<SubmissionDocument, 'sellerId'>,
): Promise<UserDocument | null> {
  return User.findById(submission.sellerId);
}
