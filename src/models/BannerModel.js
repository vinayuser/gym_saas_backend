import prisma from '../config/database.js';

export const findMany = (gymId, { skip, limit, search, status, isActive }) => {
  const where = {
    gymId,
    deletedAt: null,
    ...(status ? { status } : {}),
    ...(isActive !== undefined ? { isActive } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { internalCode: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  return Promise.all([
    prisma.banner.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    }),
    prisma.banner.count({ where }),
  ]);
};

export const findById = (id, gymId) =>
  prisma.banner.findFirst({
    where: { id, gymId, deletedAt: null },
  });

export const create = (data) => prisma.banner.create({ data });

export const update = (id, data) => prisma.banner.update({ where: { id }, data });

export const softDelete = (id) =>
  prisma.banner.update({
    where: { id },
    data: { deletedAt: new Date(), isActive: false },
  });

export const countByGym = (gymId, status) =>
  prisma.banner.count({
    where: {
      gymId,
      deletedAt: null,
      ...(status ? { status } : {}),
    },
  });
