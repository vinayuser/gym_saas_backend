import * as BannerService from '../services/BannerService.js';
import { successResponse, paginatedResponse } from '../utils/response.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const list = asyncHandler(async (req, res) => {
  const result = await BannerService.list(req.tenantId, req.params.gymId, req.query);
  paginatedResponse(res, result.banners, result.pagination);
});

export const stats = asyncHandler(async (req, res) => {
  const data = await BannerService.stats(req.tenantId, req.params.gymId);
  successResponse(res, data);
});

export const getById = asyncHandler(async (req, res) => {
  const banner = await BannerService.getById(
    req.tenantId,
    req.params.gymId,
    req.params.bannerId
  );
  successResponse(res, banner);
});

export const create = asyncHandler(async (req, res) => {
  const banner = await BannerService.create(req.tenantId, req.params.gymId, req.body);
  successResponse(res, banner, 'Banner created successfully', 201);
});

export const update = asyncHandler(async (req, res) => {
  const banner = await BannerService.update(
    req.tenantId,
    req.params.gymId,
    req.params.bannerId,
    req.body
  );
  successResponse(res, banner, 'Banner updated successfully');
});

export const remove = asyncHandler(async (req, res) => {
  const result = await BannerService.remove(
    req.tenantId,
    req.params.gymId,
    req.params.bannerId
  );
  successResponse(res, result);
});

export const duplicate = asyncHandler(async (req, res) => {
  const banner = await BannerService.duplicate(
    req.tenantId,
    req.params.gymId,
    req.params.bannerId
  );
  successResponse(res, banner, 'Banner duplicated successfully', 201);
});
