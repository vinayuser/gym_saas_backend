import prisma from '../config/database.js';

export const findById = (id) =>
  prisma.tenant.findFirst({
    where: { id, deletedAt: null },
    include: {
      subscription: {
        include: {
          plan: true,
          payments: { orderBy: { createdAt: 'desc' }, take: 5 },
        },
      },
      owner: { select: { id: true, email: true, firstName: true, lastName: true } },
      _count: { select: { gyms: true, users: true } },
    },
  });

export const findBySlug = (slug) =>
  prisma.tenant.findFirst({ where: { slug, deletedAt: null } });

export const create = (data) => prisma.tenant.create({ data });

export const update = (id, data) => prisma.tenant.update({ where: { id }, data });

export const countGyms = (tenantId) =>
  prisma.gym.count({ where: { tenantId, deletedAt: null } });
