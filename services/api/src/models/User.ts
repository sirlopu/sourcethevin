import { Schema, model, Types, type InferSchemaType } from 'mongoose';

export const USER_ROLES = ['seller', 'trade_desk', 'admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const USER_STATUSES = ['pending', 'active', 'suspended'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

const dealershipSchema = new Schema(
  {
    // Admin invitations may create seller accounts before dealership details are known.
    // Self-registration still requires these fields at the request-validation layer.
    name: { type: String, trim: true },
    licenseNumber: { type: String, trim: true },
    phone: { type: String, required: true, trim: true },
  },
  { _id: false },
);

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: USER_ROLES,
      required: true,
    },
    tenantId: { type: Schema.Types.ObjectId, required: true },
    dealership: { type: dealershipSchema },
    status: {
      type: String,
      enum: USER_STATUSES,
      required: true,
      default: 'pending',
    },
    mustChangePassword: { type: Boolean, required: true, default: false },
    refreshTokenHash: { type: String, default: null, select: false },
    refreshTokenExpiresAt: { type: Date, default: null, select: false },
  },
  { timestamps: true },
);

export type UserDocument = InferSchemaType<typeof userSchema> & { _id: Types.ObjectId };
export const User = model('User', userSchema);
