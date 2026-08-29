import { randomBytes } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../config/database.js';
import env from '../config/env.js';
import * as InviteModel from '../models/InviteModel.js';
import * as RazorpayService from './RazorpayService.js';
import { hashPassword } from '../utils/password.js';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../utils/errors.js';
import { parsePagination, buildPaginationMeta } from '../utils/response.js';

const slugify = (text) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'gym';

const generateToken = () => `inv-${randomBytes(16).toString('hex')}`;

const assertInviteUsable = (invite) => {
  if (!invite) throw new NotFoundError('Invite not found');
  if (invite.status === 'REVOKED') throw new BadRequestError('This invite has been revoked');
  if (invite.status === 'ACCEPTED') throw new BadRequestError('This invite has already been used');
  if (new Date(invite.expiresAt) < new Date()) {
    throw new BadRequestError('This invite has expired');
  }
};

const serializeInvite = (invite) => ({
  ...invite,
  planName: invite.plan?.name,
  planType: invite.plan?.type,
  priceMonthly: invite.plan?.priceMonthly,
});

export const listPlans = async () => {
  const plans = await prisma.subscriptionPlan.findMany({
    where: { isActive: true },
    orderBy: { priceMonthly: 'asc' },
  });
  return plans;
};

export const listInvites = async (query) => {
  const pagination = parsePagination(query);
  const { items, total } = await InviteModel.findMany({
    status: query.status && query.status !== 'ALL' ? query.status : undefined,
    search: query.search,
    skip: (pagination.page - 1) * pagination.limit,
    take: pagination.limit,
  });

  return {
    invites: items.map(serializeInvite),
    pagination: buildPaginationMeta(total, pagination.page, pagination.limit),
  };
};

export const createInvite = async (userId, body) => {
  const plan = await prisma.subscriptionPlan.findUnique({ where: { id: body.planId } });
  if (!plan) throw new BadRequestError('Invalid subscription plan');

  const email = body.email.trim().toLowerCase();
  const existingOwner = await prisma.user.findFirst({
    where: { email, role: 'GYM_OWNER', deletedAt: null },
  });
  if (existingOwner?.tenantId) {
    throw new ConflictError('A gym owner account already exists for this email');
  }

  const pending = await prisma.gymInvite.findFirst({
    where: {
      email,
      status: { in: ['PENDING', 'SENT', 'PAYMENT_PENDING'] },
    },
  });
  if (pending) {
    throw new ConflictError('An active invite already exists for this email');
  }

  const expiryDays = body.expiryDays ?? 14;
  const expiresAt = new Date(Date.now() + expiryDays * 86400000);

  const invite = await InviteModel.create({
    email,
    inviteeName: body.inviteeName?.trim() || null,
    businessName: body.businessName?.trim() || null,
    note: body.note?.trim() || null,
    token: generateToken(),
    planId: plan.id,
    status: 'PENDING',
    expiresAt,
    createdById: userId,
  });

  return serializeInvite(invite);
};

export const markSent = async (id) => {
  const invite = await InviteModel.findById(id);
  if (!invite) throw new NotFoundError('Invite not found');
  assertInviteUsable(invite);

  const updated = await InviteModel.update(id, {
    status: invite.status === 'PENDING' ? 'SENT' : invite.status,
    sentAt: invite.sentAt || new Date(),
  });
  return serializeInvite(updated);
};

export const revoke = async (id) => {
  const invite = await InviteModel.findById(id);
  if (!invite) throw new NotFoundError('Invite not found');
  if (invite.status === 'ACCEPTED') throw new BadRequestError('Cannot revoke an accepted invite');

  const updated = await InviteModel.update(id, { status: 'REVOKED' });
  return serializeInvite(updated);
};

export const getPublicInvite = async (token) => {
  const invite = await InviteModel.findByToken(token);
  if (!invite) throw new NotFoundError('Invite not found');

  if (invite.status === 'ACCEPTED') {
    return {
      id: invite.id,
      email: invite.email,
      status: invite.status,
      completed: true,
      plan: invite.plan,
    };
  }

  assertInviteUsable(invite);

  const payload = {
    id: invite.id,
    email: invite.email,
    inviteeName: invite.inviteeName,
    businessName: invite.businessName,
    status: invite.status,
    expiresAt: invite.expiresAt,
    plan: invite.plan,
    paymentPending: invite.status === 'PAYMENT_PENDING',
  };

  if (invite.status === 'PAYMENT_PENDING' && invite.onboardingData) {
    const { password: _password, ...safeOnboarding } = invite.onboardingData;
    payload.onboardingData = safeOnboarding;
  }

  return payload;
};

const buildOnboardingData = (invite, body) => {
  if (invite.status === 'PAYMENT_PENDING' && invite.onboardingData) {
    const existing = invite.onboardingData;
    return {
      ...existing,
      ...(body.password?.length >= 8 ? { password: body.password } : {}),
      ...(body.businessName?.trim() ? { businessName: body.businessName.trim() } : {}),
      description: body.description ?? existing.description ?? '',
      contactPhones: body.contactPhones?.filter(Boolean) ?? existing.contactPhones ?? [],
      supportEmails: body.supportEmails?.filter(Boolean) ?? existing.supportEmails ?? [],
      location: body.location ?? existing.location ?? '',
      city: body.city ?? existing.city ?? '',
      state: body.state ?? existing.state ?? '',
      postalCode: body.postalCode ?? existing.postalCode ?? '',
      logoUrl: body.logoUrl ?? existing.logoUrl ?? null,
      videoUrl: body.videoUrl ?? existing.videoUrl ?? null,
      photoUrls: body.photoUrls ?? existing.photoUrls ?? [],
      firstName: body.firstName ?? existing.firstName ?? invite.inviteeName?.split(/\s+/)[0] ?? 'Owner',
      lastName: body.lastName ?? existing.lastName ?? invite.inviteeName?.split(/\s+/).slice(1).join(' ') ?? '',
    };
  }

  if (!body.password || body.password.length < 8) {
    throw new BadRequestError('Password must be at least 8 characters');
  }
  if (!body.businessName?.trim()) {
    throw new BadRequestError('Business name is required');
  }

  return {
    password: body.password,
    businessName: body.businessName.trim(),
    description: body.description || '',
    contactPhones: (body.contactPhones || []).filter(Boolean),
    supportEmails: (body.supportEmails || []).filter(Boolean),
    location: body.location || '',
    city: body.city || '',
    state: body.state || '',
    postalCode: body.postalCode || '',
    logoUrl: body.logoUrl || null,
    videoUrl: body.videoUrl || null,
    photoUrls: body.photoUrls || [],
    firstName: body.firstName || invite.inviteeName?.split(/\s+/)[0] || 'Owner',
    lastName: body.lastName || invite.inviteeName?.split(/\s+/).slice(1).join(' ') || '',
  };
};

export const createCheckout = async (token, body) => {
  const invite = await InviteModel.findByToken(token);
  assertInviteUsable(invite);

  const onboardingData = buildOnboardingData(invite, body);
  const amountInr = Number(invite.plan.priceMonthly);

  // Reuse an open order so a retried payment still matches the invite record.
  if (invite.status === 'PAYMENT_PENDING' && invite.razorpayOrderId) {
    await InviteModel.update(invite.id, { onboardingData });

    return {
      orderId: invite.razorpayOrderId,
      amount: Math.round(amountInr * 100),
      currency: 'INR',
      keyId: RazorpayService.getPublicKey(),
      mock: !RazorpayService.isConfigured(),
      inviteEmail: invite.email,
      planName: invite.plan.name,
      amountInr,
    };
  }

  const receipt = `invite_${invite.id.slice(0, 8)}`;
  const order = await RazorpayService.createOrder({
    amountInr,
    receipt,
    notes: { inviteId: invite.id, email: invite.email },
  });

  await InviteModel.update(invite.id, {
    status: 'PAYMENT_PENDING',
    razorpayOrderId: order.id,
    onboardingData,
  });

  return {
    orderId: order.id,
    amount: order.amount,
    currency: order.currency || 'INR',
    keyId: RazorpayService.getPublicKey(),
    mock: Boolean(order.mock),
    inviteEmail: invite.email,
    planName: invite.plan.name,
    amountInr,
  };
};

export const verifyPaymentAndProvision = async (token, body) => {
  const invite = await InviteModel.findByToken(token);

  if (invite?.status === 'ACCEPTED' && invite.tenantId) {
    const owner = await prisma.user.findFirst({
      where: { email: invite.email.toLowerCase(), role: 'GYM_OWNER', deletedAt: null },
      select: { email: true },
    });
    return {
      message: 'Onboarding already complete',
      tenantId: invite.tenantId,
      email: owner?.email || invite.email,
      alreadyActivated: true,
    };
  }

  assertInviteUsable(invite);

  if (!invite.onboardingData) {
    throw new BadRequestError('Complete onboarding before payment');
  }

  let orderId = body.razorpay_order_id || body.orderId || invite.razorpayOrderId;
  let paymentId = body.razorpay_payment_id || body.paymentId;
  const signature = body.razorpay_signature || body.signature;

  if (!orderId) {
    throw new BadRequestError('Payment details are required');
  }

  if (invite.razorpayOrderId && invite.razorpayOrderId !== orderId) {
    throw new BadRequestError('Order mismatch');
  }

  const isMockOrder = String(orderId).startsWith('order_mock_');

  if (!paymentId && RazorpayService.isConfigured() && !isMockOrder) {
    const captured = await RazorpayService.fetchCapturedPaymentForOrder(orderId);
    if (captured) {
      paymentId = captured.id;
    }
  }

  if (!paymentId) {
    throw new BadRequestError('Payment not found. Complete payment or try again.');
  }

  if (signature) {
    RazorpayService.verifyPaymentSignature({ orderId, paymentId, signature });
  } else if (RazorpayService.isConfigured() && !isMockOrder) {
    await RazorpayService.verifyPaymentOnOrder({ orderId, paymentId });
  } else if (!isMockOrder) {
    throw new BadRequestError('Payment signature is required');
  }

  const onboarding = invite.onboardingData;
  const email = invite.email.toLowerCase();

  const existingOwner = await prisma.user.findFirst({
    where: { email, role: 'GYM_OWNER', deletedAt: null },
  });
  if (existingOwner?.tenantId) {
    throw new ConflictError('Gym owner account already exists');
  }

  const hashedPassword = await hashPassword(onboarding.password);
  let slugBase = slugify(onboarding.businessName);
  const slugTaken = await prisma.tenant.findUnique({ where: { slug: slugBase } });
  if (slugTaken) slugBase = `${slugBase}-${Date.now().toString(36)}`;

  let gymSlug = slugify(onboarding.businessName);
  const gymSlugExists = await prisma.gym.findFirst({
    where: { slug: gymSlug },
  });
  if (gymSlugExists) gymSlug = `${gymSlug}-${Date.now().toString(36)}`;

  const periodEnd = new Date();
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  const result = await prisma.$transaction(async (tx) => {
    const owner = await tx.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName: onboarding.firstName,
        lastName: onboarding.lastName,
        phone: onboarding.contactPhones?.[0] || null,
        role: 'GYM_OWNER',
        status: 'ACTIVE',
        emailVerified: true,
        emailVerifiedAt: new Date(),
      },
    });

    const tenant = await tx.tenant.create({
      data: {
        name: onboarding.businessName,
        slug: slugBase,
        email,
        phone: onboarding.contactPhones?.[0] || null,
        logo: onboarding.logoUrl,
        ownerId: owner.id,
      },
    });

    await tx.user.update({
      where: { id: owner.id },
      data: { tenantId: tenant.id },
    });

    const subscription = await tx.subscription.create({
      data: {
        tenantId: tenant.id,
        planId: invite.planId,
        status: 'ACTIVE',
        currentPeriodStart: new Date(),
        currentPeriodEnd: periodEnd,
      },
    });

    await tx.saasPayment.create({
      data: {
        subscriptionId: subscription.id,
        amount: invite.plan.priceMonthly,
        currency: 'INR',
        status: 'COMPLETED',
        provider: 'razorpay',
        providerRef: paymentId,
        paidAt: new Date(),
      },
    });

    const gym = await tx.gym.create({
      data: {
        tenantId: tenant.id,
        name: onboarding.businessName,
        slug: gymSlug,
        description: onboarding.description || null,
        email: onboarding.supportEmails?.[0] || email,
        phone: onboarding.contactPhones?.[0] || null,
        address: onboarding.location || null,
        city: onboarding.city || null,
        state: onboarding.state || null,
        pincode: onboarding.postalCode || null,
        logo: onboarding.logoUrl,
        images: onboarding.photoUrls || [],
        qrCodeSecret: uuidv4(),
        operatingHours: onboarding.videoUrl
          ? { promoVideoUrl: onboarding.videoUrl }
          : undefined,
      },
    });

    await tx.gymInvite.update({
      where: { id: invite.id },
      data: {
        status: 'ACCEPTED',
        acceptedAt: new Date(),
        tenantId: tenant.id,
        razorpayPaymentId: paymentId,
        razorpayOrderId: orderId,
      },
    });

    return { owner, tenant, gym };
  });

  return {
    message: 'Onboarding complete',
    tenantId: result.tenant.id,
    gymId: result.gym.id,
    email: result.owner.email,
  };
};

export const getInviteLink = (token) => `${env.frontendUrl}/setup/${token}`;
