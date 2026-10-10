import { withId, timestamps } from './common.projection.js';

export const userPublic = withId({
  tenantId: 1,
  email: 1,
  firstName: 1,
  lastName: 1,
  phone: 1,
  avatar: 1,
  role: 1,
  status: 1,
  emailVerified: 1,
  emailVerifiedAt: 1,
  twoFactorEnabled: 1,
  twoFactorConfirmedAt: 1,
  notificationPreferences: 1,
  lastLoginAt: 1,
  ...timestamps,
});

export const userAuth = withId({
  tenantId: 1,
  email: 1,
  password: 1,
  firstName: 1,
  lastName: 1,
  phone: 1,
  avatar: 1,
  role: 1,
  status: 1,
  emailVerified: 1,
  twoFactorEnabled: 1,
  totpSecret: 1,
  notificationPreferences: 1,
  ...timestamps,
});

export const userBrief = withId({
  email: 1,
  firstName: 1,
  lastName: 1,
  phone: 1,
  avatar: 1,
  role: 1,
  status: 1,
});

export const userSession = withId({
  token: 1,
  userAgent: 1,
  ipAddress: 1,
  createdAt: 1,
  lastUsedAt: 1,
  expiresAt: 1,
});
