import * as AttendanceService from '../services/AttendanceService.js';
import { successResponse } from '../utils/response.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const list = asyncHandler(async (req, res) => {
  const result = await AttendanceService.list(req.tenantId, req.params.gymId, req.query);
  successResponse(res, result, 'Success', 200, { pagination: result.pagination });
});

export const lookup = asyncHandler(async (req, res) => {
  const result = await AttendanceService.lookup(req.tenantId, req.params.gymId, req.query);
  successResponse(res, result);
});

export const checkIn = asyncHandler(async (req, res) => {
  const record = await AttendanceService.checkIn(req.tenantId, req.params.gymId, req.body);
  const message = record.action === 'CHECK_OUT' ? 'Checked out' : 'Checked in';
  successResponse(res, record, message, 201);
});
