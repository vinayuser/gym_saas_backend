import * as TenantService from '../services/TenantService.js';
import { successResponse } from '../utils/response.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getCurrent = asyncHandler(async (req, res) => {
  const tenant = await TenantService.getCurrent(req.tenantId);
  successResponse(res, tenant);
});

export const update = asyncHandler(async (req, res) => {
  const tenant = await TenantService.update(req.tenantId, req.user.id, req.body);
  successResponse(res, tenant, 'Tenant updated successfully');
});
