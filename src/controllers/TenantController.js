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

export const list = asyncHandler(async (req, res) => {
  const result = await TenantService.listTenants(req.query);
  successResponse(res, result);
});

export const updateStatus = asyncHandler(async (req, res) => {
  const tenant = await TenantService.updateTenantStatus(req.params.id, req.body.isActive);
  successResponse(res, { tenant }, `Tenant ${tenant.isActive ? 'activated' : 'deactivated'}`);
});

export const updateFeatures = asyncHandler(async (req, res) => {
  const tenant = await TenantService.updateTenantFeatures(req.params.id, req.body.features);
  successResponse(res, { tenant }, 'Tenant features updated');
});
