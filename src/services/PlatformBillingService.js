import prisma from '../config/database.js';
import { BadRequestError, ForbiddenError, NotFoundError } from '../utils/errors.js';

const CATALOG_ID = 'default';

const DEFAULT_ADDONS = [
  {
    key: 'attendance',
    name: 'Attendance',
    description: 'QR and front-desk check-in for this gym.',
    pricePerGymMonthly: 1999,
    pricePerGymYearly: 19990,
    sortOrder: 1,
  },
  {
    key: 'store',
    name: 'Member store',
    description: 'Products, categories, and orders for this gym.',
    pricePerGymMonthly: 499,
    pricePerGymYearly: 4990,
    sortOrder: 2,
  },
  {
    key: 'day_pass',
    name: 'Day pass',
    description: 'List this gym so members of other gyms can book one day.',
    pricePerGymMonthly: 499,
    pricePerGymYearly: 4990,
    sortOrder: 3,
  },
];

const money = (value) => Number(value);

const limitOrNull = (value) => {
  if (value === '' || value === undefined || value === null) return null;
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1) {
    throw new BadRequestError('Limits must be a positive whole number, or empty for unlimited');
  }
  return number;
};

const priceOrThrow = (value, label) => {
  const number = Number(value);
  if (Number.isNaN(number) || number < 0) throw new BadRequestError(`Invalid ${label}`);
  return number;
};

const readAddons = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { attendance: false, store: false, day_pass: false };
  }
  return {
    attendance: Boolean(value.attendance),
    store: Boolean(value.store),
    day_pass: Boolean(value.day_pass),
  };
};

const limitsFrom = (staff, trainers, members, plans) => ({
  staff,
  trainers,
  members,
  plans,
});

const serializeCatalog = (row, addons) => ({
  baseName: row.baseName,
  baseDescription: row.baseDescription || '',
  basePriceMonthly: money(row.basePriceMonthly),
  basePriceYearly: money(row.basePriceYearly),
  baseLimits: limitsFrom(row.baseMaxStaff, row.baseMaxTrainers, row.baseMaxMembers, row.baseMaxPlans),
  extraGymPriceMonthly: money(row.extraGymPriceMonthly),
  extraGymPriceYearly: money(row.extraGymPriceYearly),
  extraUseBaseLimits: row.extraUseBaseLimits,
  extraLimits: limitsFrom(row.extraMaxStaff, row.extraMaxTrainers, row.extraMaxMembers, row.extraMaxPlans),
  addons: addons.map((addon) => ({
    key: addon.key,
    name: addon.name,
    description: addon.description || '',
    pricePerGymMonthly: money(addon.pricePerGymMonthly),
    pricePerGymYearly: money(addon.pricePerGymYearly),
    isActive: addon.isActive,
    sortOrder: addon.sortOrder,
  })),
});

const ensureCatalog = async () => {
  await prisma.platformCatalog.upsert({
    where: { id: CATALOG_ID },
    update: {},
    create: {
      id: CATALOG_ID,
      baseName: 'Base gym',
      baseDescription: 'First gym on the platform. Extra gyms and modules are added on top.',
      basePriceMonthly: 1999,
      basePriceYearly: 19990,
      extraGymPriceMonthly: 999,
      extraGymPriceYearly: 9990,
      extraUseBaseLimits: true,
    },
  });

  for (const addon of DEFAULT_ADDONS) {
    await prisma.platformAddon.upsert({
      where: { key: addon.key },
      update: {},
      create: addon,
    });
  }
};

export const getCatalog = async () => {
  await ensureCatalog();
  const [row, addons] = await Promise.all([
    prisma.platformCatalog.findUnique({ where: { id: CATALOG_ID } }),
    prisma.platformAddon.findMany({ orderBy: { sortOrder: 'asc' } }),
  ]);
  return serializeCatalog(row, addons);
};

export const updateCatalog = async (body) => {
  await ensureCatalog();
  const data = {
    baseName: String(body.baseName || '').trim() || 'Base gym',
    baseDescription: body.baseDescription?.trim() || null,
    basePriceMonthly: priceOrThrow(body.basePriceMonthly, 'base monthly price'),
    basePriceYearly: priceOrThrow(body.basePriceYearly, 'base yearly price'),
    baseMaxStaff: limitOrNull(body.baseMaxStaff),
    baseMaxTrainers: limitOrNull(body.baseMaxTrainers),
    baseMaxMembers: limitOrNull(body.baseMaxMembers),
    baseMaxPlans: limitOrNull(body.baseMaxPlans),
    extraGymPriceMonthly: priceOrThrow(body.extraGymPriceMonthly, 'extra gym monthly price'),
    extraGymPriceYearly: priceOrThrow(body.extraGymPriceYearly, 'extra gym yearly price'),
    extraUseBaseLimits: body.extraUseBaseLimits !== false,
    extraMaxStaff: limitOrNull(body.extraMaxStaff),
    extraMaxTrainers: limitOrNull(body.extraMaxTrainers),
    extraMaxMembers: limitOrNull(body.extraMaxMembers),
    extraMaxPlans: limitOrNull(body.extraMaxPlans),
  };

  await prisma.platformCatalog.update({ where: { id: CATALOG_ID }, data });
  return getCatalog();
};

export const updateAddon = async (key, body) => {
  const addon = await prisma.platformAddon.findUnique({ where: { key } });
  if (!addon) throw new NotFoundError('Add-on not found');

  await prisma.platformAddon.update({
    where: { key },
    data: {
      name: body.name != null ? String(body.name).trim() : addon.name,
      description: body.description != null ? String(body.description).trim() : addon.description,
      pricePerGymMonthly:
        body.pricePerGymMonthly != null
          ? priceOrThrow(body.pricePerGymMonthly, 'add-on monthly price')
          : addon.pricePerGymMonthly,
      pricePerGymYearly:
        body.pricePerGymYearly != null
          ? priceOrThrow(body.pricePerGymYearly, 'add-on yearly price')
          : addon.pricePerGymYearly,
      isActive: typeof body.isActive === 'boolean' ? body.isActive : addon.isActive,
    },
  });

  return getCatalog();
};

const limitsForIndex = (catalog, index) => {
  if (index === 0 || catalog.extraUseBaseLimits) return catalog.baseLimits;
  return catalog.extraLimits;
};

const countResource = (gymId, resource) => {
  if (resource === 'staff') return prisma.gymStaff.count({ where: { gymId, isActive: true } });
  if (resource === 'trainers') return prisma.trainer.count({ where: { gymId, isActive: true } });
  if (resource === 'members') return prisma.member.count({ where: { gymId, deletedAt: null } });
  return prisma.gymMembershipPlan.count({ where: { gymId, deletedAt: null } });
};

const RESOURCE_LABEL = {
  staff: 'Staff',
  trainers: 'Trainers',
  members: 'Members',
  plans: 'Membership plans',
};

export const assertGymCapacity = async (tenantId, gymId, resource) => {
  const catalog = await getCatalog();
  const gyms = await prisma.gym.findMany({
    where: { tenantId, deletedAt: null },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });
  const index = Math.max(0, gyms.findIndex((gym) => gym.id === gymId));
  const cap = limitsForIndex(catalog, index)[resource];
  if (cap == null) return;

  const count = await countResource(gymId, resource);
  if (count >= cap) {
    throw new ForbiddenError(
      `${RESOURCE_LABEL[resource]} limit reached (${cap}) for this gym. Ask the platform admin to raise the plan limit.`
    );
  }
};

export const quoteForGyms = (catalog, gyms) => {
  const lines = [];
  const activeAddons = catalog.addons.filter((addon) => addon.isActive);

  gyms.forEach((gym, index) => {
    const isBase = index === 0;
    lines.push({
      label: isBase ? catalog.baseName : 'Extra gym',
      gymId: gym.id,
      gymName: gym.name,
      amount: isBase ? catalog.basePriceMonthly : catalog.extraGymPriceMonthly,
    });

    const flags = readAddons(gym.commercialAddons);
    activeAddons.forEach((addon) => {
      if (!flags[addon.key]) return;
      lines.push({
        label: addon.name,
        gymId: gym.id,
        gymName: gym.name,
        amount: addon.pricePerGymMonthly,
      });
    });
  });

  const total = lines.reduce((sum, line) => sum + line.amount, 0);
  return { lines, total };
};

export const accountForTenant = async (tenantId) => {
  const catalog = await getCatalog();
  const gyms = await prisma.gym.findMany({
    where: { tenantId, deletedAt: null },
    orderBy: { createdAt: 'asc' },
    select: { id: true, name: true, commercialAddons: true, dayPassPrice: true },
  });

  const gymRows = gyms.map((gym, index) => ({
    id: gym.id,
    name: gym.name,
    isBase: index === 0,
    addons: readAddons(gym.commercialAddons),
    dayPassPrice: gym.dayPassPrice == null ? null : money(gym.dayPassPrice),
    limits: limitsForIndex(catalog, index),
  }));

  return {
    catalog,
    gyms: gymRows,
    quote: quoteForGyms(catalog, gyms),
  };
};

export const updateGymCommercial = async (tenantId, gymId, body, actor) => {
  if (body.addons !== undefined && actor?.role !== 'SUPER_ADMIN') {
    throw new ForbiddenError('Optional tools can only be changed by the platform admin');
  }
  const gym = await prisma.gym.findFirst({ where: { id: gymId, tenantId, deletedAt: null } });
  if (!gym) throw new NotFoundError('Gym not found');

  const current = readAddons(gym.commercialAddons);
  const nextAddons = {
    ...current,
    ...(body.addons || {}),
  };
  const data = { commercialAddons: readAddons(nextAddons) };

  if (body.dayPassPrice !== undefined) {
    data.dayPassPrice = body.dayPassPrice === null || body.dayPassPrice === ''
      ? null
      : priceOrThrow(body.dayPassPrice, 'day pass price');
  }

  await prisma.gym.update({ where: { id: gymId }, data });
  return accountForTenant(tenantId);
};
