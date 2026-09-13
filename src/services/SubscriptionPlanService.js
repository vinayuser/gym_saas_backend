import prisma from '../config/database.js';
import { BadRequestError, NotFoundError } from '../utils/errors.js';

const serializePlan = (plan) => ({
  id: plan.id,
  name: plan.name,
  type: plan.type,
  gymLimit: plan.gymLimit,
  priceMonthly: Number(plan.priceMonthly),
  priceYearly: Number(plan.priceYearly),
  features: plan.features || [],
  isActive: plan.isActive,
  createdAt: plan.createdAt,
  updatedAt: plan.updatedAt,
  inviteCount: plan._count?.gymInvites ?? 0,
  subscriptionCount: plan._count?.subscriptions ?? 0,
});

export const listPlans = async ({ activeOnly = false } = {}) => {
  const plans = await prisma.subscriptionPlan.findMany({
    where: activeOnly ? { isActive: true } : undefined,
    orderBy: { priceMonthly: 'asc' },
    include: {
      _count: {
        select: {
          gymInvites: true,
          subscriptions: true,
        },
      },
    },
  });

  return plans.map(serializePlan);
};

export const getPlanById = async (id) => {
  const plan = await prisma.subscriptionPlan.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          gymInvites: true,
          subscriptions: true,
        },
      },
    },
  });
  if (!plan) throw new NotFoundError('Plan not found');
  return serializePlan(plan);
};

export const updatePlan = async (id, body) => {
  const existing = await prisma.subscriptionPlan.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Plan not found');

  const data = {};
  if (body.name != null) {
    const name = String(body.name).trim();
    if (!name) throw new BadRequestError('Name is required');
    data.name = name;
  }
  if (body.priceMonthly != null) {
    const price = Number(body.priceMonthly);
    if (Number.isNaN(price) || price < 0) throw new BadRequestError('Invalid monthly price');
    data.priceMonthly = price;
  }
  if (body.priceYearly != null) {
    const price = Number(body.priceYearly);
    if (Number.isNaN(price) || price < 0) throw new BadRequestError('Invalid yearly price');
    data.priceYearly = price;
  }
  if (body.gymLimit != null) {
    const limit = Number(body.gymLimit);
    if (!Number.isInteger(limit) || limit === 0 || limit < -1) {
      throw new BadRequestError('Gym limit must be a positive integer or -1 for unlimited');
    }
    data.gymLimit = limit;
  }
  if (body.features !== undefined) {
    data.features = Array.isArray(body.features) ? body.features : [];
  }
  if (typeof body.isActive === 'boolean') {
    data.isActive = body.isActive;
  }

  if (Object.keys(data).length === 0) {
    throw new BadRequestError('Nothing to update');
  }

  const updated = await prisma.subscriptionPlan.update({
    where: { id },
    data,
    include: {
      _count: {
        select: {
          gymInvites: true,
          subscriptions: true,
        },
      },
    },
  });

  return serializePlan(updated);
};
