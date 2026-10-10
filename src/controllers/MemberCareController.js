import * as MemberCareService from '../services/MemberCareService.js';
import { successResponse } from '../utils/response.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const listPlans = asyncHandler(async (req, res) => {
  const data = await MemberCareService.listPlans(req.tenantId, req.params.gymId, req.params.memberId);
  successResponse(res, data);
});

export const createWorkout = asyncHandler(async (req, res) => {
  const data = await MemberCareService.createWorkout(
    req.tenantId,
    req.params.gymId,
    req.params.memberId,
    req.body,
    req.user
  );
  successResponse(res, data, 'Workout plan saved', 201);
});

export const updateWorkout = asyncHandler(async (req, res) => {
  const data = await MemberCareService.updateWorkout(
    req.tenantId,
    req.params.gymId,
    req.params.memberId,
    req.params.planId,
    req.body
  );
  successResponse(res, data, 'Workout plan updated');
});

export const removeWorkout = asyncHandler(async (req, res) => {
  const data = await MemberCareService.removeWorkout(
    req.tenantId,
    req.params.gymId,
    req.params.memberId,
    req.params.planId
  );
  successResponse(res, data);
});

export const createDiet = asyncHandler(async (req, res) => {
  const data = await MemberCareService.createDiet(
    req.tenantId,
    req.params.gymId,
    req.params.memberId,
    req.body
  );
  successResponse(res, data, 'Diet plan saved', 201);
});

export const updateDiet = asyncHandler(async (req, res) => {
  const data = await MemberCareService.updateDiet(
    req.tenantId,
    req.params.gymId,
    req.params.memberId,
    req.params.planId,
    req.body
  );
  successResponse(res, data, 'Diet plan updated');
});

export const removeDiet = asyncHandler(async (req, res) => {
  const data = await MemberCareService.removeDiet(
    req.tenantId,
    req.params.gymId,
    req.params.memberId,
    req.params.planId
  );
  successResponse(res, data);
});

export const createMeasurement = asyncHandler(async (req, res) => {
  const data = await MemberCareService.createMeasurement(
    req.tenantId,
    req.params.gymId,
    req.params.memberId,
    req.body
  );
  successResponse(res, data, 'Measurement saved', 201);
});

export const removeMeasurement = asyncHandler(async (req, res) => {
  const data = await MemberCareService.removeMeasurement(
    req.tenantId,
    req.params.gymId,
    req.params.memberId,
    req.params.measurementId
  );
  successResponse(res, data);
});
