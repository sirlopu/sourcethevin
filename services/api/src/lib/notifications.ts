import type { Types } from 'mongoose';
import { buildEmailHtml, sendEmail } from './email';
import { Notification, type NotificationType } from '../models/Notification';
import { type UserDocument, User } from '../models/User';
import type { SubmissionDocument } from '../models/Submission';

interface RecipientLike {
  _id: Types.ObjectId | string;
  email: string;
}

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
  if (recipients.length === 0) return;

  await Notification.insertMany(
    recipients.map((recipient) => ({
      tenantId,
      submissionId,
      recipientId: recipient._id,
      type,
      title,
      body,
      link,
    })),
  );

  for (const recipient of recipients) {
    void sendEmail({
      to: recipient.email,
      subject: title,
      html: buildEmailHtml(title, body),
      text: body,
    }).catch((err) => console.error(`[notify:email] failed for ${recipient.email}`, err));
  }
}

/** Every trade_desk/admin user in a tenant — there's no per-submission desk assignment, so
 * queue-facing events fan out to the whole desk staff, matching how the desk queue itself
 * is scoped tenant-wide rather than per-agent. */
export function getDeskRecipients(tenantId: Types.ObjectId | string): Promise<UserDocument[]> {
  return User.find({ tenantId, role: { $in: ['trade_desk', 'admin'] } });
}

export async function getSeller(
  submission: Pick<SubmissionDocument, 'sellerId'>,
): Promise<UserDocument | null> {
  return User.findById(submission.sellerId);
}
