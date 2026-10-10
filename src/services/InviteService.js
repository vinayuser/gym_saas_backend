import { randomBytes } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import env from '../config/env.js';
import * as InviteModel from '../models/InviteModel.js';
import * as RazorpayService from './RazorpayService.js';
import {
  User,
  Tenant,
  Subscription,
  SubscriptionPlan,
  SaasPayment,
  Gym,
  GymInvite,
  Member,
  GymStaff,
  Trainer,
  GymMembershipPlan,
  MemberPayment,
  Invoice,
  Attendance,
  Sale,
  Product,
  Event,
  Enquiry,
  Banner,
  GymBranch,
  Membership,
} from '../schemas/index.js';
import { paginate, countDocuments } from '../helpers/pagination.js';
import { createDoc, updateById, asDoc } from '../helpers/document.js';
import { lookupOne, notDeleted, textSearch } from '../helpers/query.js';
import { COLLECTIONS, PAGE, SORT, ROLES, DEFAULT_APP_ADS } from '../helpers/constants.js';
import { normalizeAppAds } from '../helpers/appAds.js';
import { hashPassword } from '../utils/password.js';
import {
  BadRequestError,
  ConflictError,
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

const isExtraBranch = (invite) => invite?.purpose === 'EXTRA_BRANCH';

const serializeInvite = (invite) => {
  const primaryGym = invite.tenant?.gyms?.[0] || null;
  return {
    ...invite,
    purpose: invite.purpose || 'ONBOARD',
    planName: invite.plan?.name,
    planType: invite.plan?.type,
    priceMonthly: invite.plan?.priceMonthly,
    primaryGym,
  };
};

export const listPlans = async () => {
  const plans = await SubscriptionPlan.find({ isActive: true }).sort({ priceMonthly: 1 });
  return plans.map(asDoc);
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
  const purpose = body.purpose === 'EXTRA_BRANCH' ? 'EXTRA_BRANCH' : 'ONBOARD';
  const expiryDays = body.expiryDays ?? 14;
  const expiresAt = new Date(Date.now() + expiryDays * 86400000);
  const branchName = body.businessName?.trim();
  if (!branchName) throw new BadRequestError('Gym / branch name is required');

  if (purpose === 'EXTRA_BRANCH') {
    let parentInvite = null;
    if (body.parentInviteId) {
      parentInvite = await InviteModel.findById(body.parentInviteId);
      if (!parentInvite) throw new NotFoundError('Parent invite not found');
      if (parentInvite.status !== 'ACCEPTED' || !parentInvite.tenantId) {
        throw new BadRequestError('Extra branch invites can only be created for an accepted business');
      }
    }

    const tenantId = body.existingTenantId || parentInvite?.tenantId;
    if (!tenantId) throw new BadRequestError('existingTenantId or parentInviteId is required');

    const tenant = asDoc(await Tenant.findOne({ _id: tenantId, ...notDeleted }));
    if (!tenant) throw new NotFoundError('Business not found');
    if (!tenant.isActive) throw new BadRequestError('This business is inactive');

    const owner = asDoc(
      await User.findOne({
        tenantId,
        role: ROLES.GYM_OWNER,
        ...notDeleted,
      })
    );
    if (!owner) throw new BadRequestError('This business has no gym owner account');

    const pendingBranch = asDoc(
      await GymInvite.findOne({
        purpose: 'EXTRA_BRANCH',
        existingTenantId: tenantId,
        status: { $in: ['PENDING', 'SENT', 'PAYMENT_PENDING'] },
      })
    );
    if (pendingBranch) {
      throw new ConflictError('An active extra-branch invite already exists for this business');
    }

    const plan = body.planId
      ? asDoc(await SubscriptionPlan.findById(body.planId))
      : parentInvite?.planId
        ? asDoc(await SubscriptionPlan.findById(parentInvite.planId))
        : asDoc(await SubscriptionPlan.findOne({ isActive: true }).sort({ priceMonthly: 1 }));
    if (!plan) throw new BadRequestError('No subscription plan is configured');

    const invite = await InviteModel.create({
      email: owner.email,
      inviteeName:
        body.inviteeName?.trim() ||
        [owner.firstName, owner.lastName].filter(Boolean).join(' ') ||
        parentInvite?.inviteeName ||
        null,
      businessName: branchName,
      note: body.note?.trim() || null,
      purpose: 'EXTRA_BRANCH',
      existingTenantId: tenantId,
      parentInviteId: parentInvite?.id || body.parentInviteId || null,
      token: generateToken(),
      planId: plan.id,
      status: 'PENDING',
      expiresAt,
      createdById: userId,
    });

    return serializeInvite(invite);
  }

  const plan = body.planId
    ? asDoc(await SubscriptionPlan.findById(body.planId))
    : asDoc(await SubscriptionPlan.findOne({ isActive: true }).sort({ priceMonthly: 1 }));
  if (!plan) throw new BadRequestError('No subscription plan is configured');

  const email = String(body.email || '')
    .trim()
    .toLowerCase();
  if (!email) throw new BadRequestError('email is required');

  const existingOwner = asDoc(await User.findOne({ email, role: ROLES.GYM_OWNER, ...notDeleted }));
  if (existingOwner?.tenantId) {
    throw new ConflictError('A gym owner account already exists for this email');
  }

  const pending = asDoc(
    await GymInvite.findOne({
      email,
      status: { $in: ['PENDING', 'SENT', 'PAYMENT_PENDING'] },
      $nor: [{ purpose: 'EXTRA_BRANCH' }],
    })
  );
  if (pending) {
    throw new ConflictError('An active invite already exists for this email');
  }

  const invite = await InviteModel.create({
    email,
    inviteeName: body.inviteeName?.trim() || null,
    businessName: branchName,
    note: body.note?.trim() || null,
    purpose: 'ONBOARD',
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
  const extraBranch = isExtraBranch(invite);
  const monthlyPrice = extraBranch ? catalog.extraGymPriceMonthly : catalog.basePriceMonthly;
  const planLabel = extraBranch ? 'Extra gym' : catalog.baseName;
  const payload = {
    id: invite.id,
    email: invite.email,
    inviteeName: invite.inviteeName,
    businessName: invite.businessName,
    purpose: invite.purpose || 'ONBOARD',
    existingTenantId: invite.existingTenantId || null,
    parentInviteId: invite.parentInviteId || null,
    status: invite.status,
    expiresAt: invite.expiresAt,
    plan: {
      ...invite.plan,
      name: planLabel,
      priceMonthly: monthlyPrice,
    },
    billing: {
      baseName: catalog.baseName,
      basePriceMonthly: catalog.basePriceMonthly,
      extraGymPriceMonthly: catalog.extraGymPriceMonthly,
      addons: catalog.addons,
      chargeLabel: planLabel,
      chargeMonthly: monthlyPrice,
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

const selectedAddonQuote = (catalog, addonKeys, baseAmount) => {
  const active = catalog.addons.filter((addon) => addon.isActive);
  const allowed = new Set(active.map((addon) => addon.key));
  const selected = [...new Set((addonKeys || []).filter((key) => allowed.has(key)))];
  const addonTotal = active
    .filter((addon) => selected.includes(addon.key))
    .reduce((sum, addon) => sum + addon.pricePerGymMonthly, 0);
  return {
    addonKeys: selected,
    amountInr: Number(baseAmount) + addonTotal,
  };
};

const buildOnboardingData = (invite, body) => {
  const businessName = lockedBusinessName(invite);
  const extraBranch = isExtraBranch(invite);

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

  if (!extraBranch && (!body.password || body.password.length < 8)) {
    throw new BadRequestError('Password must be at least 8 characters');
  }

  return {
    ...(extraBranch ? {} : { password: body.password }),
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
  const extraBranch = isExtraBranch(invite);
  const baseAmount = extraBranch ? catalog.extraGymPriceMonthly : catalog.basePriceMonthly;
  const planName = extraBranch ? 'Extra gym' : catalog.baseName;
  const quote = selectedAddonQuote(catalog, draft.addonKeys, baseAmount);
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
      planName,
      amountInr,
      purpose: invite.purpose || 'ONBOARD',
    };
  }

  const receipt = `invite_${invite.id.slice(0, 8)}`;
  const order = await RazorpayService.createOrder({
    amountInr,
    receipt,
    notes: {
      inviteId: invite.id,
      email: invite.email,
      purpose: invite.purpose || 'ONBOARD',
    },
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
    planName,
    amountInr,
    purpose: invite.purpose || 'ONBOARD',
  };
};

export const verifyPaymentAndProvision = async (token, body) => {
  const invite = await InviteModel.findByToken(token);

  if (invite?.status === 'ACCEPTED' && invite.tenantId) {
    const owner = asDoc(
      await User.findOne({ email: invite.email.toLowerCase(), role: ROLES.GYM_OWNER, ...notDeleted }).select('email')
    );
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

  const addonFlags = {
    attendance: false,
    store: false,
    day_pass: false,
  };
  (onboarding.addonKeys || []).forEach((key) => {
    if (key in addonFlags) addonFlags[key] = true;
  });

  let gymSlug = slugify(onboarding.businessName);
  const gymSlugExists = asDoc(await Gym.findOne({ slug: gymSlug, deletedAt: null }));
  if (gymSlugExists) gymSlug = `${gymSlug}-${Date.now().toString(36)}`;

  if (isExtraBranch(invite)) {
    const tenantId = invite.existingTenantId;
    if (!tenantId) throw new BadRequestError('This extra-branch invite is missing its business link');

    const tenant = asDoc(await Tenant.findOne({ _id: tenantId, ...notDeleted }));
    if (!tenant) throw new NotFoundError('Business not found');
    if (!tenant.isActive) throw new BadRequestError('This business is inactive');

    const owner = asDoc(
      await User.findOne({ tenantId, role: ROLES.GYM_OWNER, ...notDeleted }).select(
        'email firstName lastName'
      )
    );
    if (!owner) throw new BadRequestError('Gym owner account not found for this business');

    const subscription = asDoc(await Subscription.findOne({ tenantId, ...notDeleted }));
    if (!subscription) throw new BadRequestError('No active subscription found for this business');

    await createDoc(SaasPayment, {
      subscriptionId: subscription.id,
      tenantId,
      amount: onboarding.amountInr ?? 0,
      currency: 'INR',
      status: 'COMPLETED',
      provider: 'razorpay',
      providerRef: paymentId,
      paidAt: new Date(),
    });

    const gym = await createDoc(Gym, {
      tenantId,
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
      appAds: { ...DEFAULT_APP_ADS },
      adsEnabled: true,
      operatingHours: onboarding.videoUrl ? { promoVideoUrl: onboarding.videoUrl } : undefined,
    });

    await InviteModel.update(invite.id, {
      status: 'ACCEPTED',
      acceptedAt: new Date(),
      tenantId,
      razorpayPaymentId: paymentId,
      razorpayOrderId: orderId,
    });

    return {
      message: 'Extra branch added',
      tenantId,
      gymId: gym.id,
      email: owner.email,
      purpose: 'EXTRA_BRANCH',
    };
  }

  const existingOwner = asDoc(await User.findOne({ email, role: ROLES.GYM_OWNER, ...notDeleted }));
  if (existingOwner?.tenantId) {
    throw new ConflictError('Gym owner account already exists');
  }

  const hashedPassword = await hashPassword(onboarding.password);
  let slugBase = slugify(onboarding.businessName);
  const slugTaken = asDoc(await Tenant.findOne({ slug: slugBase }));
  if (slugTaken) slugBase = `${slugBase}-${Date.now().toString(36)}`;

  const periodEnd = new Date();
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  const owner = await createDoc(User, {
    email,
    password: hashedPassword,
    firstName: onboarding.firstName,
    lastName: onboarding.lastName,
    phone: onboarding.contactPhones?.[0] || null,
    role: ROLES.GYM_OWNER,
    status: 'ACTIVE',
    emailVerified: true,
    emailVerifiedAt: new Date(),
  });

  const tenant = await createDoc(Tenant, {
    name: onboarding.businessName,
    slug: slugBase,
    email,
    phone: onboarding.contactPhones?.[0] || null,
    logo: onboarding.logoUrl,
    ownerId: owner.id,
  });

  await updateById(User, owner.id, { tenantId: tenant.id });

  const subscription = await createDoc(Subscription, {
    tenantId: tenant.id,
    planId: invite.planId,
    status: 'ACTIVE',
    currentPeriodStart: new Date(),
    currentPeriodEnd: periodEnd,
  });

  await createDoc(SaasPayment, {
    subscriptionId: subscription.id,
    tenantId: tenant.id,
    amount: onboarding.amountInr ?? invite.plan.priceMonthly,
    currency: 'INR',
    status: 'COMPLETED',
    provider: 'razorpay',
    providerRef: paymentId,
    paidAt: new Date(),
  });

  const gym = await createDoc(Gym, {
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
    appAds: { ...DEFAULT_APP_ADS },
    adsEnabled: true,
    operatingHours: onboarding.videoUrl ? { promoVideoUrl: onboarding.videoUrl } : undefined,
  });

  await InviteModel.update(invite.id, {
    status: 'ACCEPTED',
    acceptedAt: new Date(),
    tenantId: tenant.id,
    razorpayPaymentId: paymentId,
    razorpayOrderId: orderId,
  });

  return {
    message: 'Onboarding complete',
    tenantId: tenant.id,
    gymId: gym.id,
    email: owner.email,
    purpose: 'ONBOARD',
  };
};

export const getInviteLink = (token) => `${env.frontendUrl}/setup/${token}`;

const money = (value) => (value == null ? null : Number(value));
const nameConcat = (first, last) => ({
  $trim: { input: { $concat: [{ $ifNull: [first, ''] }, ' ', { $ifNull: [last, ''] }] } },
});

const paged = async (Model, opts) => {
  const { data, pagination } = await paginate(Model, opts);
  return { total: pagination.total, rows: data };
};

const pageFrom = ({ skip, limit }) => ({
  page: Math.floor((skip || 0) / (limit || PAGE.DEFAULT)) + 1,
  limit: limit || PAGE.DEFAULT,
});

const afterSearch = (search, fields) => {
  const match = textSearch(search, fields);
  return Object.keys(match).length ? [{ $match: match }] : [];
};

const BUSINESS_RESOURCES = {
  members: {
    noun: 'members',
    query: (gymId, paging) =>
      paged(Member, {
        match: {
          gymId,
          ...notDeleted,
          ...textSearch(paging.search, ['firstName', 'lastName', 'email', 'phone', 'memberCode']),
        },
        project: {
          _id: 0,
          id: '$_id',
          memberCode: 1,
          name: nameConcat('$firstName', '$lastName'),
          email: 1,
          phone: 1,
          isActive: 1,
          joinedAt: 1,
        },
        sort: SORT.CREATED_DESC,
        ...pageFrom(paging),
      }),
  },
  staff: {
    noun: 'staff',
    query: (gymId, paging) =>
      paged(GymStaff, {
        match: { gymId },
        before: [
          ...lookupOne(COLLECTIONS.USERS, 'userId', 'user', {
            firstName: 1,
            lastName: 1,
            email: 1,
            phone: 1,
            role: 1,
            status: 1,
          }),
          ...afterSearch(paging.search, ['user.firstName', 'user.lastName', 'user.email', 'user.phone', 'designation']),
        ],
        project: {
          _id: 0,
          id: '$_id',
          name: nameConcat('$user.firstName', '$user.lastName'),
          email: '$user.email',
          phone: '$user.phone',
          role: '$user.role',
          status: '$user.status',
          designation: 1,
          isActive: 1,
          joinedAt: 1,
        },
        sort: { joinedAt: -1 },
        ...pageFrom(paging),
      }),
  },
  trainers: {
    noun: 'trainers',
    query: (gymId, paging) =>
      paged(Trainer, {
        match: { gymId },
        before: [
          ...lookupOne(COLLECTIONS.USERS, 'userId', 'user', {
            firstName: 1,
            lastName: 1,
            email: 1,
            phone: 1,
          }),
          ...afterSearch(paging.search, ['user.firstName', 'user.lastName', 'user.email', 'user.phone']),
        ],
        project: {
          _id: 0,
          id: '$_id',
          name: nameConcat('$user.firstName', '$user.lastName'),
          email: '$user.email',
          phone: '$user.phone',
          specialties: 1,
          experience: 1,
          isActive: 1,
        },
        sort: SORT.CREATED_DESC,
        ...pageFrom(paging),
      }),
  },
  plans: {
    noun: 'plans',
    query: (gymId, paging) =>
      paged(GymMembershipPlan, {
        match: { gymId, ...notDeleted, ...textSearch(paging.search, ['name']) },
        project: {
          _id: 0,
          id: '$_id',
          name: 1,
          price: 1,
          billingCycle: 1,
          durationDays: 1,
          isActive: 1,
        },
        sort: SORT.CREATED_DESC,
        ...pageFrom(paging),
      }),
  },
  payments: {
    noun: 'payments',
    query: (gymId, paging) =>
      paged(MemberPayment, {
        match: {},
        before: [
          ...lookupOne(COLLECTIONS.MEMBERSHIPS, 'membershipId', 'membership', { gymId: 1, memberId: 1 }),
          { $match: { $or: [{ gymId }, { 'membership.gymId': gymId }] } },
          ...lookupOne(COLLECTIONS.MEMBERS, 'membership.memberId', 'member', {
            firstName: 1,
            lastName: 1,
          }),
          ...afterSearch(paging.search, ['member.firstName', 'member.lastName', 'method', 'status']),
        ],
        project: {
          _id: 0,
          id: '$_id',
          amount: 1,
          status: 1,
          method: 1,
          paidAt: 1,
          createdAt: 1,
          member: nameConcat('$member.firstName', '$member.lastName'),
        },
        sort: SORT.CREATED_DESC,
        ...pageFrom(paging),
      }),
  },
  invoices: {
    noun: 'invoices',
    query: (gymId, paging) =>
      paged(Invoice, {
        match: { gymId, ...textSearch(paging.search, ['invoiceNumber', 'status']) },
        project: {
          _id: 0,
          id: '$_id',
          invoiceNumber: 1,
          totalAmount: 1,
          status: 1,
          issuedAt: 1,
          paidAt: 1,
        },
        sort: SORT.CREATED_DESC,
        ...pageFrom(paging),
      }),
  },
  attendance: {
    noun: 'check-ins',
    query: (gymId, paging) =>
      paged(Attendance, {
        match: { gymId },
        before: [
          ...lookupOne(COLLECTIONS.MEMBERS, 'memberId', 'member', { firstName: 1, lastName: 1 }),
          ...afterSearch(paging.search, ['member.firstName', 'member.lastName', 'type', 'source']),
        ],
        project: {
          _id: 0,
          id: '$_id',
          type: 1,
          source: 1,
          checkInAt: 1,
          checkOutAt: 1,
          member: nameConcat('$member.firstName', '$member.lastName'),
        },
        sort: { checkInAt: -1 },
        ...pageFrom(paging),
      }),
  },
  orders: {
    noun: 'orders',
    query: (gymId, paging) =>
      paged(Sale, {
        match: { gymId, ...textSearch(paging.search, ['orderNumber', 'status', 'fulfillmentStatus']) },
        project: {
          _id: 0,
          id: '$_id',
          orderNumber: 1,
          totalAmount: 1,
          status: 1,
          fulfillmentStatus: 1,
          soldAt: 1,
        },
        sort: { soldAt: -1 },
        ...pageFrom(paging),
      }),
  },
  products: {
    noun: 'products',
    query: (gymId, paging) =>
      paged(Product, {
        match: { gymId, ...notDeleted, ...textSearch(paging.search, ['name', 'sku']) },
        project: {
          _id: 0,
          id: '$_id',
          name: 1,
          sku: 1,
          price: 1,
          stockQty: 1,
          isActive: 1,
        },
        sort: SORT.CREATED_DESC,
        ...pageFrom(paging),
      }),
  },
  events: {
    noun: 'events',
    query: (gymId, paging) =>
      paged(Event, {
        match: { gymId, ...textSearch(paging.search, ['title', 'type', 'location']) },
        project: {
          _id: 0,
          id: '$_id',
          title: 1,
          type: 1,
          description: 1,
          imageUrl: 1,
          startAt: 1,
          endAt: 1,
          location: 1,
          price: 1,
          seatLimit: 1,
          isActive: 1,
        },
        sort: { startAt: -1 },
        ...pageFrom(paging),
      }),
  },
  leads: {
    noun: 'leads',
    query: (gymId, paging) =>
      paged(Enquiry, {
        match: { gymId, ...textSearch(paging.search, ['name', 'lastName', 'email', 'phone', 'source', 'status']) },
        project: {
          _id: 0,
          id: '$_id',
          name: nameConcat('$name', '$lastName'),
          email: 1,
          phone: 1,
          status: 1,
          source: 1,
          createdAt: 1,
        },
        sort: SORT.CREATED_DESC,
        ...pageFrom(paging),
      }),
  },
  banners: {
    noun: 'banners',
    query: (gymId, paging) =>
      paged(Banner, {
        match: { gymId, ...notDeleted, ...textSearch(paging.search, ['name', 'placement', 'status']) },
        project: {
          _id: 0,
          id: '$_id',
          name: 1,
          placement: 1,
          status: 1,
          isActive: 1,
          impressions: 1,
          clicks: 1,
        },
        sort: SORT.CREATED_DESC,
        ...pageFrom(paging),
      }),
  },
};

const loadGymSnapshot = async (gym) => {
  const gymId = gym.id;
  const memberWhere = { gymId, ...notDeleted };

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
    branchCount,
  ] = await Promise.all([
    countDocuments(Member, memberWhere),
    countDocuments(GymStaff, { gymId }),
    countDocuments(Trainer, { gymId }),
    countDocuments(GymMembershipPlan, { gymId, ...notDeleted }),
    countDocuments(Membership, { gymId, status: 'ACTIVE' }),
    countDocuments(MemberPayment, { gymId }),
    countDocuments(Invoice, { gymId }),
    countDocuments(Sale, { gymId }),
    countDocuments(Attendance, { gymId }),
    countDocuments(Event, { gymId }),
    countDocuments(Enquiry, { gymId }),
    countDocuments(Product, { gymId, ...notDeleted }),
    countDocuments(Banner, { gymId, ...notDeleted }),
    countDocuments(GymBranch, { gymId }),
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
    adsEnabled: gym.adsEnabled,
    appAds: normalizeAppAds(gym.appAds, gym.adsEnabled),
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
      branches: branchCount,
    },
  };
};

export const listBusinessRecords = async (inviteId, query) => {
  const invite = await InviteModel.findById(inviteId);
  if (!invite) throw new NotFoundError('Invite not found');
  if (!invite.tenantId) throw new NotFoundError('This invite has no gym yet');

  const resource = String(query.resource || '').trim();
  const handler = BUSINESS_RESOURCES[resource];
  if (!handler) throw new BadRequestError('Unknown records resource');

  const gyms = await Gym.find({ tenantId: invite.tenantId, ...notDeleted }).select('_id');
  const gymIds = gyms.map((g) => String(g._id));
  const requested = String(query.gymId || '').trim();
  const gymId = gymIds.includes(requested) ? requested : gymIds[0];
  if (!gymId) throw new NotFoundError('Gym not found for this business');

  const pagination = parsePagination({ ...query, limit: query.limit || 10 });
  const { rows, total } = await handler.query(gymId, pagination);
  return {
    resource,
    gymId,
    rows,
    pagination: buildPaginationMeta(total, pagination.page, pagination.limit),
  };
};

export const getBusinessOverview = async (inviteId) => {
  const invite = await InviteModel.findById(inviteId);
  if (!invite) throw new NotFoundError('Invite not found');

  const tenant = invite.tenant;
  let payments = [];
  if (tenant?.subscription) {
    const rows = (
      await SaasPayment.find({ subscriptionId: tenant.subscription.id }).sort(SORT.CREATED_DESC).limit(10)
    ).map(asDoc);
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
    ? (await Gym.find({ tenantId: tenant.id, ...notDeleted }).sort({ createdAt: 1 })).map(asDoc)
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
