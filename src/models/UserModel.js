import prisma from '../config/database.js';

export const findByEmail = (email, tenantId = null) =>
  prisma.user.findFirst({
    where: {
      email: email.toLowerCase(),
      ...(tenantId !== undefined ? { tenantId } : {}),
      deletedAt: null,
    },
  });

export const findById = (id) =>
  prisma.user.findFirst({
    where: { id, deletedAt: null },
    include: {
      tenant: { select: { id: true, name: true, slug: true } },
      roleAssignments: { include: { role: true, gym: { select: { id: true, name: true } } } },
    },
  });

export const create = (data) => prisma.user.create({ data });

export const update = (id, data) => prisma.user.update({ where: { id }, data });
