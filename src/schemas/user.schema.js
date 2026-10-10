import mongoose from 'mongoose';
import { defineSchema } from '../helpers/schema.js';
import { COLLECTIONS, ROLES, USER_STATUS } from '../helpers/constants.js';

export const User = mongoose.models.User || mongoose.model(
  'User',
  defineSchema(
    {
      tenantId: { type: String, default: null, index: true },
      email: { type: String, required: true, lowercase: true, trim: true, index: true },
      password: { type: String, required: true },
      firstName: { type: String, required: true },
      lastName: { type: String, required: true },
      phone: String,
      avatar: String,
      role: { type: String, enum: Object.values(ROLES), default: ROLES.MEMBER },
      status: { type: String, enum: Object.values(USER_STATUS), default: USER_STATUS.PENDING_VERIFICATION },
      emailVerified: { type: Boolean, default: false },
      emailVerifiedAt: Date,
      twoFactorEnabled: { type: Boolean, default: false },
      totpSecret: String,
      twoFactorConfirmedAt: Date,
      notificationPreferences: { type: mongoose.Schema.Types.Mixed },
      lastLoginAt: Date,
    },
    { collection: COLLECTIONS.USERS, indexes: [{ keys: { email: 1, tenantId: 1 }, options: { unique: true } }] }
  )
);

export const RefreshToken = mongoose.models.RefreshToken || mongoose.model(
  'RefreshToken',
  defineSchema(
    {
      userId: { type: String, required: true, index: true },
      token: { type: String, required: true, unique: true },
      expiresAt: { type: Date, required: true },
      revokedAt: Date,
      userAgent: String,
      ipAddress: String,
      lastUsedAt: Date,
    },
    { collection: COLLECTIONS.REFRESH_TOKENS }
  )
);

export const PasswordReset = mongoose.models.PasswordReset || mongoose.model(
  'PasswordReset',
  defineSchema(
    {
      userId: { type: String, required: true },
      token: { type: String, required: true, unique: true },
      expiresAt: { type: Date, required: true },
      usedAt: Date,
    },
    { collection: COLLECTIONS.PASSWORD_RESETS }
  )
);

export const OtpVerification = mongoose.models.OtpVerification || mongoose.model(
  'OtpVerification',
  defineSchema(
    {
      userId: { type: String, required: true },
      code: { type: String, required: true },
      type: { type: String, required: true },
      expiresAt: { type: Date, required: true },
      verifiedAt: Date,
    },
    { collection: COLLECTIONS.OTP_VERIFICATIONS }
  )
);
