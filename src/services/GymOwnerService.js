import prisma from '../config/database.js';
import { parsePagination, buildPaginationMeta } from '../utils/response.js';

export const listGymOwners = async (query) => {
  const pagination = parsePagination(query);
  const search = query.search?.trim();

  const where = {
    role: 'GYM_OWNER',
    deletedAt: null,
  };

  if (query.status === 'ACTIVE') where.status = 'ACTIVE';
  if (query.status === 'INACTIVE') where.status = { in: ['INACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION'] };

  if (search) {
    where.OR = [
      { email: { contains: search, mode: 'insensitive' } },
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [owners, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        status: true,
        createdAt: true,
        lastLoginAt: true,
        ownedTenant: {
          select: {
            id: true,
            name: true,
            slug: true,
            isActive: true,
            createdAt: true,
            subscription: {
              select: {
                status: true,
                currentPeriodEnd: true,
                plan: { select: { name: true, type: true } },
              },
            },
            _count: { select: { gyms: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (pagination.page - 1) * pagination.limit,
      take: pagination.limit,
    }),
    prisma.user.count({ where }),
  ]);

  return {
    owners: owners.map((o) => ({
      id: o.id,
      email: o.email,
      firstName: o.firstName,
      lastName: o.lastName,
      phone: o.phone,
      status: o.status,
      createdAt: o.createdAt,
      lastLoginAt: o.lastLoginAt,
      tenant: o.ownedTenant
        ? {
            id: o.ownedTenant.id,
            name: o.ownedTenant.name,
            slug: o.ownedTenant.slug,
            isActive: o.ownedTenant.isActive,
            gymCount: o.ownedTenant._count.gyms,
            subscription: o.ownedTenant.subscription,
          }
        : null,
    })),
    pagination: buildPaginationMeta(total, pagination.page, pagination.limit),
  };
};

export const updateOwnerStatus = async (ownerId, status) => {
  const owner = await prisma.user.findFirst({
    where: { id: ownerId, role: 'GYM_OWNER', deletedAt: null },
  });
  if (!owner) return null;

  return prisma.user.update({
    where: { id: ownerId },
    data: { status },
    select: {
      id: true,
      email: true,
      status: true,
    },
  });
};
