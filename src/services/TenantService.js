import prisma from '../config/database.js';
import * as TenantModel from '../models/TenantModel.js';
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

export const listTenants = async (query) => {
  const pagination = parsePagination(query);
  const search = (query.search || pagination.search || '').trim();

  const where = { deletedAt: null };

  if (query.status === 'ACTIVE') where.isActive = true;
  if (query.status === 'INACTIVE') where.isActive = false;

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { slug: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.tenant.findMany({
      where,
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            status: true,
          },
        },
        subscription: {
          select: {
            status: true,
            currentPeriodEnd: true,
            plan: {
              select: {
                id: true,
                name: true,
                type: true,
                gymLimit: true,
              },
            },
          },
        },
        gyms: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'asc' },
          take: 1,
          select: {
            id: true,
            name: true,
            slug: true,
            appAlias: true,
            appPublished: true,
            adsEnabled: true,
          },
        },
        _count: { select: { gyms: true, users: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: pagination.skip,
      take: pagination.limit,
    }),
    prisma.tenant.count({ where }),
  ]);

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
      gymCount: t._count.gyms,
      userCount: t._count.users,
      primaryGym: t.gyms[0] || null,
    })),
    pagination: buildPaginationMeta(total, pagination.page, pagination.limit),
  };
};

export const updateTenantStatus = async (tenantId, isActive) => {
  if (typeof isActive !== 'boolean') {
    throw new BadRequestError('isActive must be a boolean');
  }

  const tenant = await prisma.tenant.findFirst({
    where: { id: tenantId, deletedAt: null },
  });
  if (!tenant) throw new NotFoundError('Tenant not found');

  return prisma.tenant.update({
    where: { id: tenantId },
    data: { isActive },
    select: {
      id: true,
      name: true,
      slug: true,
      isActive: true,
    },
  });
};

export const updateTenantFeatures = async (tenantId, featuresInput) => {
  const tenant = await prisma.tenant.findFirst({
    where: { id: tenantId, deletedAt: null },
  });
  if (!tenant) throw new NotFoundError('Tenant not found');

  const features = normalizeTenantFeatures({
    ...normalizeTenantFeatures(tenant.features),
    ...featuresInput,
  });

  const updated = await prisma.tenant.update({
    where: { id: tenantId },
    data: { features },
    select: {
      id: true,
      name: true,
      slug: true,
      features: true,
    },
  });

  await prisma.gym.updateMany({
    where: { tenantId, deletedAt: null },
    data: { adsEnabled: features.banners },
  });

  return {
    ...updated,
    features: normalizeTenantFeatures(updated.features),
  };
};
