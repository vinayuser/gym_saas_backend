import prisma from '../config/database.js';

export const findMany = (tenantId, { skip, limit, search, sortBy, sortOrder }) => {
  const where = {
    tenantId,
    deletedAt: null,
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { city: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  return Promise.all([
    prisma.gym.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        _count: { select: { members: true, staff: true, trainers: true } },
      },
    }),
    prisma.gym.count({ where }),
  ]);
};

export const findById = (id, tenantId) =>
  prisma.gym.findFirst({
    where: { id, tenantId, deletedAt: null },
    include: {
      branches: true,
      _count: { select: { members: true, staff: true, membershipPlans: true } },
    },
  });

export const findBySlug = (tenantId, slug) =>
  prisma.gym.findFirst({ where: { tenantId, slug, deletedAt: null } });

export const create = (data) => prisma.gym.create({ data });

export const update = (id, data) => prisma.gym.update({ where: { id }, data });

export const softDelete = (id) =>
  prisma.gym.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
