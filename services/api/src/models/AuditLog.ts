import { Schema, model } from 'mongoose';

const auditLogSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true },
    submissionId: { type: Schema.Types.ObjectId, required: true, ref: 'Submission' },
    actorId: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    action: { type: String, required: true },
    detail: { type: String, required: true },
  },
  { timestamps: true },
);

export const AuditLog = model('AuditLog', auditLogSchema);
