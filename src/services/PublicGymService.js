import prisma from '../config/database.js';
import { NotFoundError } from '../utils/errors.js';

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

const mapBranding = (gym, tenant, { banners = [] } = {}) => ({
  gymId: gym.id,
  slug: gym.slug,
  appAlias: gym.appAlias || null,
  appPublished: Boolean(gym.appPublished),
  adsEnabled: gym.adsEnabled !== false,
  name: gym.name,
  tagline: gym.appTagline || tenant?.name || 'FitSphere Pro',
  logo: gym.logo || tenant?.logo || null,
  coverImage: gym.coverImage || gym.images?.[0] || null,
  primaryColor: gym.primaryColor || DEFAULT_BRANDING.primaryColor,
  secondaryColor: gym.secondaryColor || DEFAULT_BRANDING.secondaryColor,
  accentColor: gym.accentColor || DEFAULT_BRANDING.accentColor,
  themeMode: gym.themeMode || DEFAULT_BRANDING.themeMode,
  banners: gym.adsEnabled === false ? [] : banners.map(mapActiveBanner),
  tenant: tenant
    ? {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        logo: tenant.logo,
      }
    : null,
});

const gymPublicInclude = {
  tenant: {
    select: { id: true, name: true, slug: true, logo: true, isActive: true },
  },
  banners: {
    where: {
      deletedAt: null,
      isActive: true,
      status: 'ACTIVE',
    },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    take: 20,
  },
};

const assertPublishedIfAlias = (gym, lookupWasAlias) => {
  if (lookupWasAlias && !gym.appPublished) {
    throw new NotFoundError('App is not published');
  }
};

export const getBrandingBySlug = async (slug) => {
  const gym = await prisma.gym.findFirst({
    where: { slug, deletedAt: null, isActive: true },
    include: gymPublicInclude,
  });

  if (!gym || !gym.tenant?.isActive) {
    throw new NotFoundError('Gym not found');
  }

  return mapBranding(gym, gym.tenant, { banners: gym.banners });
};

export const getBrandingByAlias = async (alias) => {
  const value = String(alias || '')
    .trim()
    .toLowerCase();
  if (!value) throw new NotFoundError('Gym not found');

  const gym = await prisma.gym.findFirst({
    where: { appAlias: value, deletedAt: null, isActive: true },
    include: gymPublicInclude,
  });

  if (!gym || !gym.tenant?.isActive) {
    throw new NotFoundError('Gym not found');
  }
  assertPublishedIfAlias(gym, true);

  return mapBranding(gym, gym.tenant, { banners: gym.banners });
};

export const getPublicGymInfo = async (slug) => {
  const branding = await getBrandingBySlug(slug);

  const gym = await prisma.gym.findFirst({
    where: { id: branding.gymId, deletedAt: null },
    include: {
      membershipPlans: {
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          description: true,
          durationDays: true,
          price: true,
          billingCycle: true,
        },
        orderBy: { price: 'asc' },
        take: 10,
      },
      _count: { select: { members: true } },
    },
  });

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
    memberCount: gym._count.members,
    plans: gym.membershipPlans.map((p) => ({
      ...p,
      price: Number(p.price),
    })),
  };
};

export const resolveGym = async ({ slug, code, alias }) => {
  const value = (alias || slug || code || '').trim().toLowerCase();
  if (!value) throw new NotFoundError('Gym not found');

  // Prefer explicit alias query param, then try appAlias match
  if (alias) {
    return getBrandingByAlias(value);
  }

  const byAlias = await prisma.gym.findFirst({
    where: { appAlias: value, deletedAt: null, isActive: true },
    select: { id: true, appPublished: true },
  });
  if (byAlias) {
    return getBrandingByAlias(value);
  }

  // Try gym slug first, then tenant slug → first active gym
  try {
    return await getBrandingBySlug(value);
  } catch {
    // fall through
  }

  const tenant = await prisma.tenant.findFirst({
    where: { slug: value, deletedAt: null, isActive: true },
    include: {
      gyms: {
        where: { deletedAt: null, isActive: true },
        orderBy: { createdAt: 'asc' },
        take: 1,
        include: gymPublicInclude,
      },
    },
  });

  const gym = tenant?.gyms?.[0];
  if (!gym) throw new NotFoundError('Gym not found');

  return mapBranding(gym, tenant, { banners: gym.banners });
};

export const listPublicGymsByTenant = async (tenantSlug) => {
  const tenant = await prisma.tenant.findFirst({
    where: { slug: tenantSlug, deletedAt: null, isActive: true },
    include: {
      gyms: {
        where: { deletedAt: null, isActive: true },
        orderBy: { name: 'asc' },
        include: {
          banners: {
            where: {
              deletedAt: null,
              isActive: true,
              status: 'ACTIVE',
            },
            orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
            take: 20,
          },
        },
      },
    },
  });

  if (!tenant) throw new NotFoundError('Business not found');

  return {
    tenant: {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      logo: tenant.logo,
    },
    gyms: tenant.gyms.map((g) => mapBranding(g, tenant, { banners: g.banners })),
  };
};
