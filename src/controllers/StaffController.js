import * as StaffService from '../services/StaffService.js';
import { successResponse, paginatedResponse } from '../utils/response.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const list = asyncHandler(async (req, res) => {
  const result = await StaffService.list(req.tenantId, req.params.gymId, req.query);
  paginatedResponse(res, result.staff, result.pagination);
});

export const getById = asyncHandler(async (req, res) => {
  const staff = await StaffService.getById(
    req.tenantId,
    req.params.gymId,
    req.params.staffId
  );
  successResponse(res, staff);
});

export const create = asyncHandler(async (req, res) => {
  const staff = await StaffService.create(req.tenantId, req.params.gymId, req.body);
  successResponse(res, staff, 'Staff member created successfully', 201);
});

export const update = asyncHandler(async (req, res) => {
  const staff = await StaffService.update(
    req.tenantId,
    req.params.gymId,
    req.params.staffId,
    req.body
  );
  successResponse(res, staff, 'Staff member updated successfully');
});

export const remove = asyncHandler(async (req, res) => {
  const result = await StaffService.remove(
    req.tenantId,
    req.params.gymId,
    req.params.staffId
  );
  successResponse(res, result);
});
