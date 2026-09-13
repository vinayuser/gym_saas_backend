import * as PublicGymService from '../services/PublicGymService.js';
import { successResponse } from '../utils/response.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const branding = asyncHandler(async (req, res) => {
  const data = await PublicGymService.getBrandingBySlug(req.params.slug);
  successResponse(res, data);
});

export const gymInfo = asyncHandler(async (req, res) => {
  const data = await PublicGymService.getPublicGymInfo(req.params.slug);
  successResponse(res, data);
});

export const resolve = asyncHandler(async (req, res) => {
  const data = await PublicGymService.resolveGym(req.query);
  successResponse(res, data);
});

export const tenantGyms = asyncHandler(async (req, res) => {
  const data = await PublicGymService.listPublicGymsByTenant(req.params.tenantSlug);
  successResponse(res, data);
});
