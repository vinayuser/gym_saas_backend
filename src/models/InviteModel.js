import prisma from '../config/database.js';

const inviteInclude = {
  plan: {
    select: {
      id: true,
      name: true,
      type: true,
      gymLimit: true,
      priceMonthly: true,
      priceYearly: true,
      features: true,
    },
  },
  tenant: {
    select: {
      id: true,
      name: true,
      slug: true,
      email: true,
      phone: true,
      logo: true,
      isActive: true,
      createdAt: true,
      subscription: {
        select: {
          id: true,
          status: true,
          currentPeriodEnd: true,
          plan: { select: { name: true } },
        },
      },
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
      gyms: {
        where: { deletedAt: null },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          name: true,
          slug: true,
          logo: true,
          appAlias: true,
          appPublished: true,
          adsEnabled: true,
          isActive: true,
          commercialAddons: true,
        },
      },
    },
  },
};

export const findMany = async ({ status, search, skip, take }) => {
  const where = {};
  if (status) where.status = status;

  const emailSearch = search?.trim();
  if (emailSearch) {
    where.OR = [
      { email: { contains: emailSearch, mode: 'insensitive' } },
      { businessName: { contains: emailSearch, mode: 'insensitive' } },
      { tenant: { name: { contains: emailSearch, mode: 'insensitive' } } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.gymInvite.findMany({
      where,
      include: inviteInclude,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    prisma.gymInvite.count({ where }),
  ]);

  return { items, total };
};

export const findByToken = (token) =>
  prisma.gymInvite.findUnique({
    where: { token },
    include: inviteInclude,
  });

export const findById = (id) =>
  prisma.gymInvite.findUnique({
    where: { id },
    include: inviteInclude,
  });

export const create = (data) =>
  prisma.gymInvite.create({
    data,
    include: inviteInclude,
  });

export const update = (id, data) =>
  prisma.gymInvite.update({
    where: { id },
    data,
    include: inviteInclude,
  });

export const findByOrderId = (razorpayOrderId) =>
  prisma.gymInvite.findFirst({
    where: { razorpayOrderId },
    include: inviteInclude,
  });
