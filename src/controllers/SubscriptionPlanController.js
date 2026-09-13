import * as SubscriptionPlanService from '../services/SubscriptionPlanService.js';
import { successResponse } from '../utils/response.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const list = asyncHandler(async (req, res) => {
  const activeOnly = req.query.activeOnly === 'true';
  const plans = await SubscriptionPlanService.listPlans({ activeOnly });
  successResponse(res, { plans });
});

export const getById = asyncHandler(async (req, res) => {
  const plan = await SubscriptionPlanService.getPlanById(req.params.id);
  successResponse(res, { plan });
});

export const update = asyncHandler(async (req, res) => {
  const plan = await SubscriptionPlanService.updatePlan(req.params.id, req.body);
  successResponse(res, { plan }, 'Plan updated');
});
