import { withId, timestamps } from './common.projection.js';

export const invitePublic = withId({
  email: 1,
  inviteeName: 1,
  businessName: 1,
  note: 1,
  purpose: 1,
  existingTenantId: 1,
  parentInviteId: 1,
  token: 1,
  planId: 1,
  status: 1,
  expiresAt: 1,
  sentAt: 1,
  acceptedAt: 1,
  createdById: 1,
  tenantId: 1,
  razorpayOrderId: 1,
  razorpayPaymentId: 1,
  onboardingData: 1,
  plan: 1,
  tenant: 1,
  ...timestamps,
});

export const supportPublic = withId({
  tenantId: 1,
  userId: 1,
  category: 1,
  subject: 1,
  message: 1,
  senderEmail: 1,
  senderName: 1,
  status: 1,
  emailSent: 1,
  tenant: 1,
  user: 1,
  ...timestamps,
});

export const supportMessagePublic = withId({
  ticketId: 1,
  userId: 1,
  authorRole: 1,
  authorName: 1,
  body: 1,
  createdAt: 1,
});

export const rolePublic = withId({
  name: 1,
  slug: 1,
  description: 1,
  scope: 1,
  isSystem: 1,
  permissions: 1,
  ...timestamps,
});

export const permissionPublic = withId({
  name: 1,
  slug: 1,
  module: 1,
  description: 1,
  scope: 1,
  createdAt: 1,
});
