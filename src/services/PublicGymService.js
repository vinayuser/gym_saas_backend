import {
  Gym,
  Tenant,
  GymMembershipPlan,
  Member,
  ContactMessage,
} from '../schemas/index.js';
import { aggregateOne, countDocuments } from '../helpers/pagination.js';
import { createDoc, asDoc } from '../helpers/document.js';
import { lookupOne, notDeleted } from '../helpers/query.js';
import { COLLECTIONS } from '../helpers/constants.js';
import { gymPublic } from '../projections/gym.projection.js';
import { normalizeAppAds } from '../helpers/appAds.js';
import { NotFoundError, BadRequestError } from '../utils/errors.js';

const DEFAULT_BRANDING = {
  primaryColor: '#C3F400',
  secondaryColor: '#0B0F0A',
  accentColor: '#FFFFFF',
  themeMode: 'dark',
};

const mapActiveBanner = (b) => ({
  id: b.id,
  name: b.name,
  category: b.category,
  placement: b.placement,
  imageUrl: b.imageUrl,
  ctaType: b.ctaType,
  ctaDestination: b.ctaDestination,
  startDate: b.startDate,
  endDate: b.endDate,
});

const mapMediaAd = (ad) => ({
  id: ad.id,
  type: ad.type,
  title: ad.title,
  mediaUrl: ad.mediaUrl,
  thumbnailUrl: ad.thumbnailUrl || null,
  clickUrl: ad.clickUrl || null,
  durationSec: ad.durationSec ?? null,
});

const mapBranding = (gym, tenant, { banners = [], mediaAds = [] } = {}) => {
  const appAds = normalizeAppAds(gym.appAds, gym.adsEnabled);
  return {
    gymId: gym.id,
    slug: gym.slug,
    appAlias: gym.appAlias || null,
    appPublished: Boolean(gym.appPublished),
    adsEnabled: appAds.banners,
    appAds,
    name: gym.name,
    tagline: gym.appTagline || tenant?.name || 'FitSphere Pro',
    logo: gym.logo || tenant?.logo || null,
    coverImage: gym.coverImage || gym.images?.[0] || null,
    primaryColor: gym.primaryColor || DEFAULT_BRANDING.primaryColor,
    secondaryColor: gym.secondaryColor || DEFAULT_BRANDING.secondaryColor,
    accentColor: gym.accentColor || DEFAULT_BRANDING.accentColor,
    themeMode: gym.themeMode || DEFAULT_BRANDING.themeMode,
    banners: appAds.banners ? banners.map(mapActiveBanner) : [],
    videoAds: appAds.video ? mediaAds.filter((ad) => ad.type === 'VIDEO').map(mapMediaAd) : [],
    audioAds: appAds.audio ? mediaAds.filter((ad) => ad.type === 'AUDIO').map(mapMediaAd) : [],
    tenant: tenant
      ? {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          logo: tenant.logo,
        }
      : null,
  };
};

const bannerLookup = {
  $lookup: {
    from: COLLECTIONS.BANNERS,
    let: { gid: '$_id' },
    pipeline: [
      {
        $match: {
          $expr: { $eq: ['$gymId', '$$gid'] },
          deletedAt: null,
          isActive: true,
          status: 'ACTIVE',
        },
      },
      { $sort: { sortOrder: 1, createdAt: -1 } },
      { $limit: 20 },
      {
        $project: {
          _id: 0,
          id: '$_id',
          name: 1,
          category: 1,
          placement: 1,
          imageUrl: 1,
          ctaType: 1,
          ctaDestination: 1,
          startDate: 1,
          endDate: 1,
        },
      },
    ],
    as: 'banners',
  },
};

const mediaAdLookup = {
  $lookup: {
    from: COLLECTIONS.GYM_MEDIA_ADS,
    let: { gid: '$_id' },
    pipeline: [
      {
        $match: {
          $expr: { $eq: ['$gymId', '$$gid'] },
          deletedAt: null,
          isActive: true,
        },
      },
      { $sort: { sortOrder: 1, createdAt: -1 } },
      { $limit: 20 },
      {
        $project: {
          _id: 0,
          id: '$_id',
          type: 1,
          title: 1,
          mediaUrl: 1,
          thumbnailUrl: 1,
          clickUrl: 1,
          durationSec: 1,
        },
      },
    ],
    as: 'mediaAds',
  },
};

const brandingLookups = [
  ...lookupOne(COLLECTIONS.TENANTS, 'tenantId', 'tenant', {
    _id: 0,
    id: '$_id',
    name: 1,
    slug: 1,
    logo: 1,
    isActive: 1,
  }),
  bannerLookup,
  mediaAdLookup,
];

const findPublicGym = (match) =>
  aggregateOne(Gym, {
    match: { ...match, ...notDeleted, isActive: true },
    lookups: brandingLookups,
    project: { ...gymPublic, tenant: 1, banners: 1, mediaAds: 1 },
  });

const assertPublishedIfAlias = (gym, lookupWasAlias) => {
  if (lookupWasAlias && !gym.appPublished) {
    throw new NotFoundError('App is not published');
  }
};

export const getBrandingBySlug = async (slug) => {
  const gym = await findPublicGym({ slug });

  if (!gym || !gym.tenant?.isActive) {
    throw new NotFoundError('Gym not found');
  }

  return mapBranding(gym, gym.tenant, { banners: gym.banners, mediaAds: gym.mediaAds });
};

export const getBrandingByAlias = async (alias) => {
  const value = String(alias || '')
    .trim()
    .toLowerCase();
  if (!value) throw new NotFoundError('Gym not found');

  const gym = await findPublicGym({ appAlias: value });

  if (!gym || !gym.tenant?.isActive) {
    throw new NotFoundError('Gym not found');
  }
  assertPublishedIfAlias(gym, true);

  return mapBranding(gym, gym.tenant, { banners: gym.banners, mediaAds: gym.mediaAds });
};

export const getPublicGymInfo = async (slug) => {
  const branding = await getBrandingBySlug(slug);

  const [gym, plans, memberCount] = await Promise.all([
    asDoc(await Gym.findOne({ _id: branding.gymId, ...notDeleted })),
    GymMembershipPlan.find({ gymId: branding.gymId, isActive: true, ...notDeleted })
      .sort({ price: 1 })
      .limit(10)
      .select('name description durationDays price billingCycle'),
    countDocuments(Member, { gymId: branding.gymId, ...notDeleted }),
  ]);

  if (!gym) throw new NotFoundError('Gym not found');

  return {
    ...branding,
    email: gym.email,
    phone: gym.phone,
    address: gym.address,
    city: gym.city,
    state: gym.state,
    country: gym.country,
    pincode: gym.pincode,
    operatingHours: gym.operatingHours,
    images: gym.images || [],
    memberCount,
    plans: plans.map((p) => {
      const row = asDoc(p);
      return { ...row, price: Number(row.price) };
    }),
  };
};

export const resolveGym = async ({ slug, code, alias }) => {
  const value = (alias || slug || code || '').trim().toLowerCase();
  if (!value) throw new NotFoundError('Gym not found');

  if (alias) {
    return getBrandingByAlias(value);
  }

  const byAlias = asDoc(
    await Gym.findOne({ appAlias: value, ...notDeleted, isActive: true }).select('appPublished')
  );
  if (byAlias) {
    return getBrandingByAlias(value);
  }

  try {
    return await getBrandingBySlug(value);
  } catch {
    // fall through
  }

  const tenant = asDoc(await Tenant.findOne({ slug: value, ...notDeleted, isActive: true }));
  if (!tenant) throw new NotFoundError('Gym not found');

  const gym = await aggregateOne(Gym, {
    match: { tenantId: tenant.id, ...notDeleted, isActive: true },
    lookups: [bannerLookup, mediaAdLookup],
    project: { ...gymPublic, banners: 1, mediaAds: 1 },
  });
  if (!gym) throw new NotFoundError('Gym not found');

  return mapBranding(gym, tenant, { banners: gym.banners, mediaAds: gym.mediaAds });
};

export const listPublicGymsByTenant = async (tenantSlug) => {
  const tenant = asDoc(await Tenant.findOne({ slug: tenantSlug, ...notDeleted, isActive: true }));
  if (!tenant) throw new NotFoundError('Business not found');

  const gyms = await Gym.aggregate([
    { $match: { tenantId: tenant.id, ...notDeleted, isActive: true } },
    { $sort: { name: 1 } },
    bannerLookup,
    mediaAdLookup,
    { $project: { ...gymPublic, banners: 1, mediaAds: 1 } },
  ]);

  return {
    tenant: {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      logo: tenant.logo,
    },
    gyms: gyms.map((g) => mapBranding(g, tenant, { banners: g.banners, mediaAds: g.mediaAds })),
  };
};

export const submitContact = async (body) => {
  const name = String(body.name || '').trim();
  const email = String(body.email || '').trim().toLowerCase();
  const message = String(body.message || '').trim();
  if (!name || !email || !message) throw new BadRequestError('Name, email, and message are required');
  const row = await createDoc(ContactMessage, {
    name,
    email,
    company: body.company ? String(body.company).trim() : null,
    message,
  });
  return { id: row.id };
};
