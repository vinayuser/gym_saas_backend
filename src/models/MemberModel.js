import prisma from '../config/database.js';

export const findMany = (gymId, { skip, limit, search, sortBy, sortOrder, isActive }) => {
  const where = {
    gymId,
    deletedAt: null,
    ...(isActive !== undefined ? { isActive } : {}),
    ...(search
      ? {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search, mode: 'insensitive' } },
            { memberCode: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  return Promise.all([
    prisma.member.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        memberships: {
          where: { status: 'ACTIVE' },
          take: 1,
          include: { plan: { select: { id: true, name: true } } },
        },
      },
    }),
    prisma.member.count({ where }),
  ]);
};

export const findById = (id, gymId) =>
  prisma.member.findFirst({
    where: { id, gymId, deletedAt: null },
    include: {
      memberships: { include: { plan: true }, orderBy: { createdAt: 'desc' } },
      measurements: { orderBy: { measuredAt: 'desc' }, take: 10 },
      workoutPlans: { where: { isActive: true }, take: 5 },
      dietPlans: { where: { isActive: true }, take: 5 },
    },
  });

export const create = (memberData, membershipData = null) =>
  prisma.$transaction(async (tx) => {
    const member = await tx.member.create({ data: memberData });

    if (membershipData) {
      await tx.membership.create({
        data: {
          ...membershipData,
          memberId: member.id,
        },
      });
    }

    return tx.member.findFirst({
      where: { id: member.id },
      include: {
        memberships: {
          include: { plan: { select: { id: true, name: true, price: true, billingCycle: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  });

export const update = (id, data) => prisma.member.update({ where: { id }, data });

export const softDelete = (id) =>
  prisma.member.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });

export const countByGym = (gymId) =>
  prisma.member.count({ where: { gymId, deletedAt: null } });
