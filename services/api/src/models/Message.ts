import { Schema, model } from 'mongoose';

const messageSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true },
    submissionId: { type: Schema.Types.ObjectId, required: true, ref: 'Submission' },
    authorId: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    body: { type: String, required: true, trim: true, maxlength: 2000 },
  },
  { timestamps: true },
);

messageSchema.index({ submissionId: 1, createdAt: 1 });

export const Message = model('Message', messageSchema);
