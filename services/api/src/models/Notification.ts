import { Schema, model, Types, type InferSchemaType } from 'mongoose';

export const NOTIFICATION_TYPES = [
  'submission_submitted',
  'offer_sent',
  'offer_accepted',
  'offer_declined',
  'offer_countered',
  'trade_declined',
  'message_received',
  'seller_request_received',
  'seller_request_approved',
  'user_role_changed',
  'user_status_changed',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

const notificationSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true },
    recipientId: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    submissionId: { type: Schema.Types.ObjectId, ref: 'Submission' },
    title: { type: String, required: true },
    body: { type: String, required: true },
    link: { type: String },
    readAt: { type: Date, default: null },
  },
  { timestamps: true },
);

notificationSchema.index({ recipientId: 1, createdAt: -1 });
notificationSchema.index({ recipientId: 1, readAt: 1 });

export type NotificationDocument = InferSchemaType<typeof notificationSchema> & {
  _id: Types.ObjectId;
};
export const Notification = model('Notification', notificationSchema);
