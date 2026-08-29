import * as PlanService from '../services/MembershipPlanService.js';
import { successResponse, paginatedResponse } from '../utils/response.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const list = asyncHandler(async (req, res) => {
  const result = await PlanService.list(req.tenantId, req.params.gymId, req.query);
  paginatedResponse(res, result.plans, result.pagination);
});

export const getById = asyncHandler(async (req, res) => {
  const plan = await PlanService.getById(req.tenantId, req.params.gymId, req.params.planId);
  successResponse(res, plan);
});

export const create = asyncHandler(async (req, res) => {
  const plan = await PlanService.create(req.tenantId, req.params.gymId, req.body);
  successResponse(res, plan, 'Plan created successfully', 201);
});

export const update = asyncHandler(async (req, res) => {
  const plan = await PlanService.update(
    req.tenantId,
    req.params.gymId,
    req.params.planId,
    req.body
  );
  successResponse(res, plan, 'Plan updated successfully');
});

export const remove = asyncHandler(async (req, res) => {
  const result = await PlanService.remove(req.tenantId, req.params.gymId, req.params.planId);
  successResponse(res, result);
});
