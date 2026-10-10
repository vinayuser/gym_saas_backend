import mongoose from 'mongoose';
import { defineSchema } from '../helpers/schema.js';
import { COLLECTIONS } from '../helpers/constants.js';

export const Tenant = mongoose.models.Tenant || mongoose.model(
  'Tenant',
  defineSchema(
    {
      name: { type: String, required: true },
      slug: { type: String, required: true, unique: true },
      email: { type: String, required: true },
      phone: String,
      logo: String,
      isActive: { type: Boolean, default: true },
      features: { type: mongoose.Schema.Types.Mixed },
      ownerId: { type: String, unique: true, sparse: true },
    },
    { collection: COLLECTIONS.TENANTS, indexes: [{ keys: { isActive: 1 } }, { keys: { createdAt: -1 } }] }
  )
);

export const SubscriptionPlan = mongoose.models.SubscriptionPlan || mongoose.model(
  'SubscriptionPlan',
  defineSchema(
    {
      name: { type: String, required: true },
      type: { type: String, required: true, unique: true },
      gymLimit: { type: Number, required: true },
      priceMonthly: { type: Number, required: true },
      priceYearly: { type: Number, required: true },
      features: { type: mongoose.Schema.Types.Mixed },
      isActive: { type: Boolean, default: true },
    },
    { collection: COLLECTIONS.SUBSCRIPTION_PLANS }
  )
);

export const Subscription = mongoose.models.Subscription || mongoose.model(
  'Subscription',
  defineSchema(
    {
      tenantId: { type: String, required: true, unique: true },
      planId: { type: String, required: true },
      status: { type: String, default: 'TRIAL' },
      trialEndsAt: Date,
      currentPeriodStart: Date,
      currentPeriodEnd: Date,
      cancelledAt: Date,
      stripeCustomerId: String,
      razorpaySubId: String,
    },
    { collection: COLLECTIONS.SUBSCRIPTIONS }
  )
);

export const SaasPayment = mongoose.models.SaasPayment || mongoose.model(
  'SaasPayment',
  defineSchema(
    {
      subscriptionId: { type: String, required: true, index: true },
      tenantId: String,
      amount: { type: Number, required: true },
      currency: { type: String, default: 'INR' },
      status: { type: String, default: 'PENDING' },
      provider: String,
      providerRef: String,
      paidAt: Date,
    },
    { collection: COLLECTIONS.SAAS_PAYMENTS }
  )
);

export const PlatformCatalog = mongoose.models.PlatformCatalog || mongoose.model(
  'PlatformCatalog',
  defineSchema(
    {
      baseName: { type: String, default: 'Base gym' },
      baseDescription: String,
      basePriceMonthly: { type: Number, default: 1999 },
      basePriceYearly: { type: Number, default: 19990 },
      baseMaxStaff: Number,
      baseMaxTrainers: Number,
      baseMaxMembers: Number,
      baseMaxPlans: Number,
      extraGymPriceMonthly: { type: Number, default: 999 },
      extraGymPriceYearly: { type: Number, default: 9990 },
      extraUseBaseLimits: { type: Boolean, default: true },
      extraMaxStaff: Number,
      extraMaxTrainers: Number,
      extraMaxMembers: Number,
      extraMaxPlans: Number,
    },
    { collection: COLLECTIONS.PLATFORM_CATALOG }
  )
);

export const PlatformAddon = mongoose.models.PlatformAddon || mongoose.model(
  'PlatformAddon',
  defineSchema(
    {
      key: { type: String, required: true, unique: true },
      name: { type: String, required: true },
      description: String,
      pricePerGymMonthly: { type: Number, required: true },
      pricePerGymYearly: { type: Number, default: 0 },
      isActive: { type: Boolean, default: true },
      sortOrder: { type: Number, default: 0 },
    },
    { collection: COLLECTIONS.PLATFORM_ADDONS }
  )
);
