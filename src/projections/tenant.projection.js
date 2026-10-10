import { withId, timestamps } from './common.projection.js';

export const tenantPublic = withId({
  name: 1,
  slug: 1,
  email: 1,
  phone: 1,
  logo: 1,
  isActive: 1,
  features: 1,
  ownerId: 1,
  ...timestamps,
});

export const tenantBrief = withId({
  name: 1,
  slug: 1,
  email: 1,
  phone: 1,
  logo: 1,
  isActive: 1,
  createdAt: 1,
});

export const planPublic = withId({
  name: 1,
  type: 1,
  gymLimit: 1,
  priceMonthly: 1,
  priceYearly: 1,
  features: 1,
  isActive: 1,
  ...timestamps,
});

export const subscriptionBrief = withId({
  tenantId: 1,
  planId: 1,
  status: 1,
  trialEndsAt: 1,
  currentPeriodStart: 1,
  currentPeriodEnd: 1,
  cancelledAt: 1,
});

export const saasPaymentPublic = withId({
  subscriptionId: 1,
  amount: 1,
  currency: 1,
  status: 1,
  provider: 1,
  providerRef: 1,
  paidAt: 1,
  createdAt: 1,
});
