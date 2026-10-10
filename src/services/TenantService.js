import { Tenant, Gym } from '../schemas/index.js';
import * as TenantModel from '../models/TenantModel.js';
import { paginate } from '../helpers/pagination.js';
import { asDoc, updateById, updateMany } from '../helpers/document.js';
import { lookupOne, lookupMany, notDeleted, textSearch } from '../helpers/query.js';
import { COLLECTIONS, SORT } from '../helpers/constants.js';
import { tenantPublic } from '../projections/tenant.projection.js';
import { NotFoundError, ForbiddenError, BadRequestError } from '../utils/errors.js';
import { parsePagination, buildPaginationMeta } from '../utils/response.js';
import { normalizeTenantFeatures } from '../constants/tenantFeatures.js';

export const getCurrent = async (tenantId) => {
  if (!tenantId) {
    throw new ForbiddenError('No tenant context');
  }

  const tenant = await TenantModel.findById(tenantId);
  if (!tenant) throw new NotFoundError('Tenant not found');

  const gymCount = await TenantModel.countGyms(tenantId);

  return {
    ...tenant,
    features: normalizeTenantFeatures(tenant.features),
    usage: {
      gyms: gymCount,
      gymLimit: tenant.subscription?.plan?.gymLimit ?? 1,
    },
  };
};

export const update = async (tenantId, userId, data) => {
  const tenant = await TenantModel.findById(tenantId);
  if (!tenant) throw new NotFoundError('Tenant not found');

  if (tenant.ownerId !== userId) {
    throw new ForbiddenError('Only the gym owner can update tenant settings');
  }

  return TenantModel.update(tenantId, {
    name: data.name,
    phone: data.phone,
    logo: data.logo,
  });
};

const listLookups = [
  ...lookupOne(COLLECTIONS.USERS, 'ownerId', 'owner', {
    _id: 0,
    id: '$_id',
    email: 1,
    firstName: 1,
    lastName: 1,
    phone: 1,
    status: 1,
  }),
  {
    $lookup: {
      from: COLLECTIONS.SUBSCRIPTIONS,
      let: { tid: '$_id' },
      pipeline: [
        { $match: { $expr: { $eq: ['$tenantId', '$$tid'] } } },
        ...lookupOne(COLLECTIONS.SUBSCRIPTION_PLANS, 'planId', 'plan', {
          _id: 0,
          id: '$_id',
          name: 1,
          type: 1,
          gymLimit: 1,
        }),
        {
          $project: {
            _id: 0,
            id: '$_id',
            status: 1,
            currentPeriodEnd: 1,
            plan: 1,
          },
        },
      ],
      as: 'subscription',
    },
  },
  { $unwind: { path: '$subscription', preserveNullAndEmptyArrays: true } },
  {
    $lookup: {
      from: COLLECTIONS.GYMS,
      let: { tid: '$_id' },
      pipeline: [
        { $match: { $expr: { $eq: ['$tenantId', '$$tid'] }, deletedAt: null } },
        { $sort: { createdAt: 1 } },
        {
          $project: {
            _id: 0,
            id: '$_id',
            name: 1,
            slug: 1,
            appAlias: 1,
            appPublished: 1,
            adsEnabled: 1,
            appAds: 1,
            commercialAddons: 1,
          },
        },
      ],
      as: 'gyms',
    },
  },
  lookupMany(COLLECTIONS.USERS, '_id', 'tenantId', '_users', [
    { $match: notDeleted },
    { $project: { _id: 1 } },
  ]),
];

export const listTenants = async (query) => {
  const pagination = parsePagination(query);
  const search = (query.search || pagination.search || '').trim();

  const match = { ...notDeleted };

  if (query.status === 'ACTIVE') match.isActive = true;
  if (query.status === 'INACTIVE') match.isActive = false;

  Object.assign(match, textSearch(search, ['name', 'slug', 'email', 'phone']));

  const { data: items, pagination: pageMeta } = await paginate(Tenant, {
    match,
    lookups: listLookups,
    project: {
      ...tenantPublic,
      owner: 1,
      subscription: 1,
      gyms: 1,
      userCount: { $size: '$_users' },
    },
    sort: SORT.CREATED_DESC,
    page: pagination.page,
    limit: pagination.limit,
  });

  return {
    tenants: items.map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      email: t.email,
      phone: t.phone,
      logo: t.logo,
      isActive: t.isActive,
      features: normalizeTenantFeatures(t.features),
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      owner: t.owner,
      subscription: t.subscription,
      gymCount: t.gyms?.length || 0,
      userCount: t.userCount || 0,
      primaryGym: t.gyms?.[0] || null,
      gyms: (t.gyms || []).map((gym) => ({
        id: gym.id,
        name: gym.name,
        commercialAddons: gym.commercialAddons,
      })),
    })),
    pagination: buildPaginationMeta(pageMeta.total, pagination.page, pagination.limit),
  };
};

export const updateTenantStatus = async (tenantId, isActive) => {
  if (typeof isActive !== 'boolean') {
    throw new BadRequestError('isActive must be a boolean');
  }

  const tenant = asDoc(await Tenant.findOne({ _id: tenantId, ...notDeleted }));
  if (!tenant) throw new NotFoundError('Tenant not found');

  const updated = await updateById(Tenant, tenantId, { isActive });
  return {
    id: updated.id,
    name: updated.name,
    slug: updated.slug,
    isActive: updated.isActive,
  };
};

const ADDON_KEYS = ['attendance', 'store', 'day_pass'];

const readAddons = (value) => {
  const src = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  return {
    attendance: Boolean(src.attendance),
    store: Boolean(src.store),
    day_pass: Boolean(src.day_pass),
  };
};

export const updateGymAddons = async (tenantId, gymId, addonsInput) => {
  const gym = asDoc(await Gym.findOne({ _id: gymId, tenantId, ...notDeleted }));
  if (!gym) throw new NotFoundError('Gym not found');

  const next = readAddons(gym.commercialAddons);
  for (const key of ADDON_KEYS) {
    if (typeof addonsInput?.[key] === 'boolean') next[key] = addonsInput[key];
  }

  const updated = await updateById(Gym, gymId, { commercialAddons: next });

  return {
    id: updated.id,
    name: updated.name,
    commercialAddons: readAddons(updated.commercialAddons),
  };
};

export const updateTenantFeatures = async (tenantId, featuresInput) => {
  const tenant = asDoc(await Tenant.findOne({ _id: tenantId, ...notDeleted }));
  if (!tenant) throw new NotFoundError('Tenant not found');

  const features = normalizeTenantFeatures({
    ...normalizeTenantFeatures(tenant.features),
    ...featuresInput,
  });

  const updated = await updateById(Tenant, tenantId, { features });

  await updateMany(Gym, { tenantId, ...notDeleted }, {
    adsEnabled: features.banners,
    'appAds.banners': features.banners,
  });

  return {
    id: updated.id,
    name: updated.name,
    slug: updated.slug,
    features: normalizeTenantFeatures(updated.features),
  };
};
