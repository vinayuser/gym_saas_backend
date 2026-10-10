import * as MediaAdService from '../services/MediaAdService.js';
import { successResponse, paginatedResponse } from '../utils/response.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const list = asyncHandler(async (req, res) => {
  const result = await MediaAdService.list(req.tenantId, req.params.gymId, req.query);
  paginatedResponse(res, result.ads, result.pagination);
});

export const getById = asyncHandler(async (req, res) => {
  const ad = await MediaAdService.getById(req.tenantId, req.params.gymId, req.params.adId);
  successResponse(res, ad);
});

export const create = asyncHandler(async (req, res) => {
  const ad = await MediaAdService.create(req.tenantId, req.params.gymId, req.body);
  successResponse(res, ad, 'Ad created', 201);
});

export const update = asyncHandler(async (req, res) => {
  const ad = await MediaAdService.update(req.tenantId, req.params.gymId, req.params.adId, req.body);
  successResponse(res, ad, 'Ad updated');
});

export const remove = asyncHandler(async (req, res) => {
  const result = await MediaAdService.remove(req.tenantId, req.params.gymId, req.params.adId);
  successResponse(res, result);
});
