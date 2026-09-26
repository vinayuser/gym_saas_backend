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
import { getCatalog } from './PlatformBillingService.js';

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

const serializeInvite = (invite) => {
  const primaryGym = invite.tenant?.gyms?.[0] || null;
  return {
    ...invite,
    planName: invite.plan?.name,
    planType: invite.plan?.type,
    priceMonthly: invite.plan?.priceMonthly,
    primaryGym,
  };
};

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
    search: query.search || pagination.search,
    skip: pagination.skip,
    take: pagination.limit,
  });

  return {
    invites: items.map(serializeInvite),
    pagination: buildPaginationMeta(total, pagination.page, pagination.limit),
  };
};

export const createInvite = async (userId, body) => {
  const plan = body.planId
    ? await prisma.subscriptionPlan.findUnique({ where: { id: body.planId } })
    : await prisma.subscriptionPlan.findFirst({
        where: { isActive: true },
        orderBy: { priceMonthly: 'asc' },
      });
  if (!plan) throw new BadRequestError('No subscription plan is configured');

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

  const catalog = await getCatalog();
  const payload = {
    id: invite.id,
    email: invite.email,
    inviteeName: invite.inviteeName,
    businessName: invite.businessName,
    status: invite.status,
    expiresAt: invite.expiresAt,
    plan: {
      ...invite.plan,
      name: catalog.baseName,
      priceMonthly: catalog.basePriceMonthly,
    },
    billing: {
      baseName: catalog.baseName,
      basePriceMonthly: catalog.basePriceMonthly,
      extraGymPriceMonthly: catalog.extraGymPriceMonthly,
      addons: catalog.addons,
    },
    paymentPending: invite.status === 'PAYMENT_PENDING',
  };

  if (invite.status === 'PAYMENT_PENDING' && invite.onboardingData) {
    const { password: _password, ...safeOnboarding } = invite.onboardingData;
    payload.onboardingData = safeOnboarding;
  }

  return payload;
};

const lockedBusinessName = (invite) => {
  const name = invite.businessName?.trim();
  if (!name) {
    throw new BadRequestError('This invite has no gym name. Ask the platform team to set it.');
  }
  return name;
};

const selectedAddonQuote = (catalog, addonKeys) => {
  const active = catalog.addons.filter((addon) => addon.isActive);
  const allowed = new Set(active.map((addon) => addon.key));
  const selected = [...new Set((addonKeys || []).filter((key) => allowed.has(key)))];
  const addonTotal = active
    .filter((addon) => selected.includes(addon.key))
    .reduce((sum, addon) => sum + addon.pricePerGymMonthly, 0);
  return {
    addonKeys: selected,
    amountInr: catalog.basePriceMonthly + addonTotal,
  };
};

const buildOnboardingData = (invite, body) => {
  const businessName = lockedBusinessName(invite);

  if (invite.status === 'PAYMENT_PENDING' && invite.onboardingData) {
    const existing = invite.onboardingData;
    return {
      ...existing,
      businessName,
      ...(body.password?.length >= 8 ? { password: body.password } : {}),
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
      addonKeys: body.addonKeys ?? existing.addonKeys ?? [],
      firstName: body.firstName ?? existing.firstName ?? invite.inviteeName?.split(/\s+/)[0] ?? 'Owner',
      lastName: body.lastName ?? existing.lastName ?? invite.inviteeName?.split(/\s+/).slice(1).join(' ') ?? '',
    };
  }

  if (!body.password || body.password.length < 8) {
    throw new BadRequestError('Password must be at least 8 characters');
  }

  return {
    password: body.password,
    businessName,
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
    addonKeys: body.addonKeys || [],
    firstName: body.firstName || invite.inviteeName?.split(/\s+/)[0] || 'Owner',
    lastName: body.lastName || invite.inviteeName?.split(/\s+/).slice(1).join(' ') || '',
  };
};

export const createCheckout = async (token, body) => {
  const invite = await InviteModel.findByToken(token);
  assertInviteUsable(invite);

  const draft = buildOnboardingData(invite, body);
  const catalog = await getCatalog();
  const quote = selectedAddonQuote(catalog, draft.addonKeys);
  const onboardingData = { ...draft, addonKeys: quote.addonKeys, amountInr: quote.amountInr };
  const amountInr = quote.amountInr;

  const sameOrder =
    invite.status === 'PAYMENT_PENDING' &&
    invite.razorpayOrderId &&
    Number(invite.onboardingData?.amountInr) === amountInr;

  // Reuse an open order only when the amount has not changed.
  if (sameOrder) {
    await InviteModel.update(invite.id, { onboardingData });

    return {
      orderId: invite.razorpayOrderId,
      amount: Math.round(amountInr * 100),
      currency: 'INR',
      keyId: RazorpayService.getPublicKey(),
      mock: !RazorpayService.isConfigured(),
      inviteEmail: invite.email,
      planName: catalog.baseName,
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
    planName: catalog.baseName,
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
        amount: onboarding.amountInr ?? invite.plan.priceMonthly,
        currency: 'INR',
        status: 'COMPLETED',
        provider: 'razorpay',
        providerRef: paymentId,
        paidAt: new Date(),
      },
    });

    const addonFlags = {
      attendance: false,
      store: false,
      day_pass: false,
    };
    (onboarding.addonKeys || []).forEach((key) => {
      if (key in addonFlags) addonFlags[key] = true;
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
        commercialAddons: addonFlags,
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

const money = (value) => (value == null ? null : Number(value));
const fullName = (first, last) => `${first || ''} ${last || ''}`.trim();
const ROW_LIMIT = 100;

const loadGymSnapshot = async (gym) => {
  const gymId = gym.id;
  const memberWhere = { gymId, deletedAt: null };

  const [
    memberCount,
    staffCount,
    trainerCount,
    planCount,
    activeMemberships,
    paymentCount,
    invoiceCount,
    orderCount,
    attendanceCount,
    eventCount,
    leadCount,
    productCount,
    bannerCount,
    members,
    staff,
    trainers,
    plans,
    payments,
    invoices,
    orders,
    attendance,
    events,
    leads,
    products,
    banners,
    branches,
  ] = await Promise.all([
    prisma.member.count({ where: memberWhere }),
    prisma.gymStaff.count({ where: { gymId } }),
    prisma.trainer.count({ where: { gymId } }),
    prisma.gymMembershipPlan.count({ where: { gymId, deletedAt: null } }),
    prisma.membership.count({ where: { gymId, status: 'ACTIVE' } }),
    prisma.memberPayment.count({ where: { membership: { gymId } } }),
    prisma.invoice.count({ where: { gymId } }),
    prisma.sale.count({ where: { gymId } }),
    prisma.attendance.count({ where: { gymId } }),
    prisma.event.count({ where: { gymId } }),
    prisma.enquiry.count({ where: { gymId } }),
    prisma.product.count({ where: { gymId, deletedAt: null } }),
    prisma.banner.count({ where: { gymId, deletedAt: null } }),
    prisma.member.findMany({
      where: memberWhere,
      orderBy: { createdAt: 'desc' },
      take: ROW_LIMIT,
      select: {
        id: true,
        memberCode: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        isActive: true,
        joinedAt: true,
      },
    }),
    prisma.gymStaff.findMany({
      where: { gymId },
      orderBy: { joinedAt: 'desc' },
      take: ROW_LIMIT,
      select: {
        id: true,
        designation: true,
        isActive: true,
        joinedAt: true,
        user: { select: { firstName: true, lastName: true, email: true, phone: true, role: true, status: true } },
      },
    }),
    prisma.trainer.findMany({
      where: { gymId },
      take: ROW_LIMIT,
      select: {
        id: true,
        specialties: true,
        experience: true,
        isActive: true,
        user: { select: { firstName: true, lastName: true, email: true, phone: true } },
      },
    }),
    prisma.gymMembershipPlan.findMany({
      where: { gymId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: ROW_LIMIT,
      select: { id: true, name: true, price: true, billingCycle: true, durationDays: true, isActive: true },
    }),
    prisma.memberPayment.findMany({
      where: { membership: { gymId } },
      orderBy: { createdAt: 'desc' },
      take: ROW_LIMIT,
      select: {
        id: true,
        amount: true,
        status: true,
        method: true,
        paidAt: true,
        createdAt: true,
        membership: { select: { member: { select: { firstName: true, lastName: true } } } },
      },
    }),
    prisma.invoice.findMany({
      where: { gymId },
      orderBy: { createdAt: 'desc' },
      take: ROW_LIMIT,
      select: { id: true, invoiceNumber: true, totalAmount: true, status: true, issuedAt: true, paidAt: true },
    }),
    prisma.sale.findMany({
      where: { gymId },
      orderBy: { soldAt: 'desc' },
      take: ROW_LIMIT,
      select: { id: true, orderNumber: true, totalAmount: true, status: true, fulfillmentStatus: true, soldAt: true },
    }),
    prisma.attendance.findMany({
      where: { gymId },
      orderBy: { checkInAt: 'desc' },
      take: ROW_LIMIT,
      select: {
        id: true,
        type: true,
        source: true,
        checkInAt: true,
        checkOutAt: true,
        member: { select: { firstName: true, lastName: true } },
      },
    }),
    prisma.event.findMany({
      where: { gymId },
      orderBy: { startAt: 'asc' },
      take: 500,
      select: {
        id: true,
        title: true,
        type: true,
        description: true,
        imageUrl: true,
        startAt: true,
        endAt: true,
        location: true,
        price: true,
        seatLimit: true,
        isActive: true,
      },
    }),
    prisma.enquiry.findMany({
      where: { gymId },
      orderBy: { createdAt: 'desc' },
      take: ROW_LIMIT,
      select: { id: true, name: true, lastName: true, email: true, phone: true, status: true, source: true, createdAt: true },
    }),
    prisma.product.findMany({
      where: { gymId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: ROW_LIMIT,
      select: { id: true, name: true, sku: true, price: true, stockQty: true, isActive: true },
    }),
    prisma.banner.findMany({
      where: { gymId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: ROW_LIMIT,
      select: { id: true, name: true, placement: true, status: true, isActive: true, impressions: true, clicks: true },
    }),
    prisma.gymBranch.findMany({
      where: { gymId },
      select: { id: true, name: true, address: true, phone: true, isActive: true },
    }),
  ]);

  return {
    id: gym.id,
    name: gym.name,
    slug: gym.slug,
    logo: gym.logo,
    email: gym.email,
    phone: gym.phone,
    address: gym.address,
    city: gym.city,
    state: gym.state,
    country: gym.country,
    pincode: gym.pincode,
    appAlias: gym.appAlias,
    appPublished: gym.appPublished,
    isActive: gym.isActive,
    commercialAddons: gym.commercialAddons,
    dayPassPrice: money(gym.dayPassPrice),
    counts: {
      members: memberCount,
      staff: staffCount,
      trainers: trainerCount,
      plans: planCount,
      activeMemberships,
      payments: paymentCount,
      invoices: invoiceCount,
      orders: orderCount,
      attendance: attendanceCount,
      events: eventCount,
      leads: leadCount,
      products: productCount,
      banners: bannerCount,
      branches: branches.length,
    },
    branches,
    members: members.map((m) => ({
      id: m.id,
      memberCode: m.memberCode,
      name: fullName(m.firstName, m.lastName),
      email: m.email,
      phone: m.phone,
      isActive: m.isActive,
      joinedAt: m.joinedAt,
    })),
    staff: staff.map((s) => ({
      id: s.id,
      name: fullName(s.user?.firstName, s.user?.lastName),
      email: s.user?.email,
      phone: s.user?.phone,
      role: s.user?.role,
      status: s.user?.status,
      designation: s.designation,
      isActive: s.isActive,
      joinedAt: s.joinedAt,
    })),
    trainers: trainers.map((t) => ({
      id: t.id,
      name: fullName(t.user?.firstName, t.user?.lastName),
      email: t.user?.email,
      phone: t.user?.phone,
      specialties: t.specialties,
      experience: t.experience,
      isActive: t.isActive,
    })),
    plans: plans.map((p) => ({ ...p, price: money(p.price) })),
    payments: payments.map((p) => ({
      id: p.id,
      amount: money(p.amount),
      status: p.status,
      method: p.method,
      paidAt: p.paidAt,
      createdAt: p.createdAt,
      member: fullName(p.membership?.member?.firstName, p.membership?.member?.lastName),
    })),
    invoices: invoices.map((i) => ({ ...i, totalAmount: money(i.totalAmount) })),
    orders: orders.map((o) => ({ ...o, totalAmount: money(o.totalAmount) })),
    attendance: attendance.map((a) => ({
      id: a.id,
      type: a.type,
      source: a.source,
      checkInAt: a.checkInAt,
      checkOutAt: a.checkOutAt,
      member: fullName(a.member?.firstName, a.member?.lastName),
    })),
    events: events.map((e) => ({ ...e, price: money(e.price) })),
    leads: leads.map((l) => ({
      id: l.id,
      name: fullName(l.name, l.lastName),
      email: l.email,
      phone: l.phone,
      status: l.status,
      source: l.source,
      createdAt: l.createdAt,
    })),
    products: products.map((p) => ({ ...p, price: money(p.price) })),
    banners,
  };
};

export const getBusinessOverview = async (inviteId) => {
  const invite = await InviteModel.findById(inviteId);
  if (!invite) throw new NotFoundError('Invite not found');

  const tenant = invite.tenant;
  let payments = [];
  if (tenant?.subscription) {
    const rows = await prisma.saasPayment.findMany({
      where: { subscriptionId: tenant.subscription.id },
      orderBy: { createdAt: 'desc' },
      take: ROW_LIMIT,
    });
    payments = rows.map((row) => ({
      id: row.id,
      amount: money(row.amount),
      currency: row.currency,
      status: row.status,
      provider: row.provider,
      paidAt: row.paidAt,
      createdAt: row.createdAt,
    }));
  }

  const gyms = tenant
    ? await prisma.gym.findMany({
        where: { tenantId: tenant.id, deletedAt: null },
        orderBy: { createdAt: 'asc' },
      })
    : [];

  const snapshots = [];
  for (const gym of gyms) {
    snapshots.push(await loadGymSnapshot(gym));
  }

  return {
    invite: {
      id: invite.id,
      email: invite.email,
      inviteeName: invite.inviteeName,
      businessName: invite.businessName,
      note: invite.note,
      status: invite.status,
      expiresAt: invite.expiresAt,
      sentAt: invite.sentAt,
      acceptedAt: invite.acceptedAt,
      createdAt: invite.createdAt,
      planName: invite.plan?.name || null,
    },
    business: tenant
      ? {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          email: tenant.email,
          phone: tenant.phone,
          logo: tenant.logo,
          isActive: tenant.isActive,
          createdAt: tenant.createdAt,
          owner: tenant.owner,
          subscription: tenant.subscription
            ? {
                status: tenant.subscription.status,
                plan: tenant.subscription.plan,
              }
            : null,
          payments,
        }
      : null,
    gyms: snapshots,
  };
};
