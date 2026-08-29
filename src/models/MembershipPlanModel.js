import prisma from '../config/database.js';

export const findMany = (gymId, { skip, limit, search, isActive }) => {
  const where = {
    gymId,
    deletedAt: null,
    ...(isActive !== undefined ? { isActive } : {}),
    ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
  };
  return Promise.all([
    prisma.gymMembershipPlan.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { memberships: true } } },
    }),
    prisma.gymMembershipPlan.count({ where }),
  ]);
};

export const findById = (id, gymId) =>
  prisma.gymMembershipPlan.findFirst({ where: { id, gymId, deletedAt: null } });

export const create = (data) => prisma.gymMembershipPlan.create({ data });
export const update = (id, data) => prisma.gymMembershipPlan.update({ where: { id }, data });
export const softDelete = (id) =>
  prisma.gymMembershipPlan.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
