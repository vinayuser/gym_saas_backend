import * as PlatformBillingService from '../services/PlatformBillingService.js';
import { successResponse } from '../utils/response.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getPublic = asyncHandler(async (_req, res) => {
  const catalog = await PlatformBillingService.getCatalog();
  successResponse(res, { catalog });
});

export const updateCatalog = asyncHandler(async (req, res) => {
  const catalog = await PlatformBillingService.updateCatalog(req.body);
  successResponse(res, { catalog }, 'Billing catalog saved');
});

export const updateAddon = asyncHandler(async (req, res) => {
  const catalog = await PlatformBillingService.updateAddon(req.params.key, req.body);
  successResponse(res, { catalog }, 'Add-on updated');
});

export const getMine = asyncHandler(async (req, res) => {
  const account = await PlatformBillingService.accountForTenant(req.tenantId);
  successResponse(res, account);
});

export const updateGymCommercial = asyncHandler(async (req, res) => {
  const account = await PlatformBillingService.updateGymCommercial(
    req.tenantId,
    req.params.gymId,
    req.body,
    req.user
  );
  successResponse(res, account, 'Gym billing updated');
});
