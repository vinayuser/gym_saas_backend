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
    select: { id: true, name: true, slug: true },
  },
};

export const findMany = async ({ status, search, skip, take }) => {
  const where = {};
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { email: { contains: search, mode: 'insensitive' } },
      { inviteeName: { contains: search, mode: 'insensitive' } },
      { businessName: { contains: search, mode: 'insensitive' } },
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
