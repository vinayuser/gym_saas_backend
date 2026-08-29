import prisma from '../config/database.js';

export const findMany = (gymId, { skip, limit, search, role, isActive }) => {
  const where = {
    gymId,
    ...(isActive !== undefined ? { isActive } : {}),
    user: {
      deletedAt: null,
      ...(role ? { role } : {}),
      ...(search
        ? {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
  };

  return Promise.all([
    prisma.gymStaff.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            role: true,
            avatar: true,
            status: true,
          },
        },
      },
    }),
    prisma.gymStaff.count({ where }),
  ]);
};

export const findById = (id, gymId) =>
  prisma.gymStaff.findFirst({
    where: { id, gymId },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          role: true,
          avatar: true,
          status: true,
        },
      },
    },
  });

export const findByUserId = (gymId, userId) =>
  prisma.gymStaff.findFirst({
    where: { gymId, userId },
  });

export const create = (data) => prisma.gymStaff.create({ data });

export const update = (id, data) => prisma.gymStaff.update({ where: { id }, data });

export const remove = (id) =>
  prisma.gymStaff.update({
    where: { id },
    data: { isActive: false },
  });
