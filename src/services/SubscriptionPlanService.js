import { SubscriptionPlan } from '../schemas/index.js';
import { aggregateOne } from '../helpers/pagination.js';
import { updateById } from '../helpers/document.js';
import { lookupMany } from '../helpers/query.js';
import { COLLECTIONS, SORT } from '../helpers/constants.js';
import { planPublic } from '../projections/tenant.projection.js';
import { BadRequestError, NotFoundError } from '../utils/errors.js';

const countLookups = [
  lookupMany(COLLECTIONS.GYM_INVITES, '_id', 'planId', '_invites', [{ $project: { _id: 1 } }]),
  lookupMany(COLLECTIONS.SUBSCRIPTIONS, '_id', 'planId', '_subs', [{ $project: { _id: 1 } }]),
  {
    $addFields: {
      _count: {
        gymInvites: { $size: '$_invites' },
        subscriptions: { $size: '$_subs' },
      },
    },
  },
];

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

const planProject = { ...planPublic, _count: 1 };

const loadPlan = (match) =>
  aggregateOne(SubscriptionPlan, {
    match,
    lookups: countLookups,
    project: planProject,
  });

export const listPlans = async ({ activeOnly = false } = {}) => {
  const plans = await SubscriptionPlan.aggregate([
    ...(activeOnly ? [{ $match: { isActive: true } }] : []),
    { $sort: { priceMonthly: 1 } },
    ...countLookups,
    { $project: planProject },
  ]);

  return plans.map(serializePlan);
};

export const getPlanById = async (id) => {
  const plan = await loadPlan({ _id: id });
  if (!plan) throw new NotFoundError('Plan not found');
  return serializePlan(plan);
};

export const updatePlan = async (id, body) => {
  const existing = await loadPlan({ _id: id });
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

  await updateById(SubscriptionPlan, id, data);
  return getPlanById(id);
};
