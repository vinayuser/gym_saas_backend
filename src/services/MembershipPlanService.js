import * as PlanModel from '../models/MembershipPlanModel.js';
import * as GymModel from '../models/GymModel.js';
import { NotFoundError } from '../utils/errors.js';
import { parsePagination, buildPaginationMeta } from '../utils/response.js';

const validateGym = async (tenantId, gymId) => {
  const gym = await GymModel.findById(gymId, tenantId);
  if (!gym) throw new NotFoundError('Gym not found');
  return gym;
};

export const list = async (tenantId, gymId, query) => {
  await validateGym(tenantId, gymId);
  const pagination = parsePagination(query);
  const isActive =
    query.isActive === 'false' ? false : query.isActive === 'true' ? true : undefined;
  const [plans, total] = await PlanModel.findMany(gymId, {
    ...pagination,
    search: pagination.search,
    isActive,
  });
  return { plans, pagination: buildPaginationMeta(total, pagination.page, pagination.limit) };
};

export const getById = async (tenantId, gymId, planId) => {
  await validateGym(tenantId, gymId);
  const plan = await PlanModel.findById(planId, gymId);
  if (!plan) throw new NotFoundError('Plan not found');
  return plan;
};

export const create = async (tenantId, gymId, body) => {
  await validateGym(tenantId, gymId);
  return PlanModel.create({
    gymId,
    name: body.name,
    description: body.description || null,
    billingCycle: body.billingCycle,
    price: body.price,
    durationDays: body.durationDays,
    features: body.features || null,
    isActive: body.isActive !== false,
  });
};

export const update = async (tenantId, gymId, planId, body) => {
  await validateGym(tenantId, gymId);
  const existing = await PlanModel.findById(planId, gymId);
  if (!existing) throw new NotFoundError('Plan not found');
  return PlanModel.update(planId, {
    ...(body.name !== undefined && { name: body.name }),
    ...(body.description !== undefined && { description: body.description }),
    ...(body.billingCycle !== undefined && { billingCycle: body.billingCycle }),
    ...(body.price !== undefined && { price: body.price }),
    ...(body.durationDays !== undefined && { durationDays: body.durationDays }),
    ...(body.features !== undefined && { features: body.features }),
    ...(body.isActive !== undefined && { isActive: body.isActive }),
  });
};

export const remove = async (tenantId, gymId, planId) => {
  await validateGym(tenantId, gymId);
  const existing = await PlanModel.findById(planId, gymId);
  if (!existing) throw new NotFoundError('Plan not found');
  await PlanModel.softDelete(planId);
  return { message: 'Plan archived successfully' };
};
