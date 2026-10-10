import * as DayPassService from '../services/DayPassService.js';
import { successResponse } from '../utils/response.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const list = asyncHandler(async (req, res) => {
  const result = await DayPassService.list(req.tenantId, req.params.gymId, req.query);
  successResponse(res, result, 'Success', 200, { pagination: result.pagination });
});

export const create = asyncHandler(async (req, res) => {
  const pass = await DayPassService.create(req.tenantId, req.params.gymId, req.body);
  successResponse(res, pass, 'Day pass issued', 201);
});

export const checkIn = asyncHandler(async (req, res) => {
  const pass = await DayPassService.checkIn(req.tenantId, req.params.gymId, req.params.passId);
  successResponse(res, pass, 'Guest checked in');
});
