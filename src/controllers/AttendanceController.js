import * as AttendanceService from '../services/AttendanceService.js';
import { successResponse } from '../utils/response.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const list = asyncHandler(async (req, res) => {
  const result = await AttendanceService.list(req.tenantId, req.params.gymId, req.query);
  successResponse(res, result, 'Success', 200, { pagination: result.pagination });
});

export const checkIn = asyncHandler(async (req, res) => {
  const record = await AttendanceService.checkIn(req.tenantId, req.params.gymId, req.body);
  successResponse(res, record, 'Check-in recorded', 201);
});
