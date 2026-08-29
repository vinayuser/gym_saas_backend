import * as CategoryService from '../services/CategoryService.js';
import { successResponse } from '../utils/response.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const list = asyncHandler(async (req, res) => {
  const categories = await CategoryService.list(req.tenantId, req.params.gymId);
  successResponse(res, categories);
});

export const create = asyncHandler(async (req, res) => {
  const category = await CategoryService.create(req.tenantId, req.params.gymId, req.body);
  successResponse(res, category, 'Category created successfully', 201);
});

export const update = asyncHandler(async (req, res) => {
  const category = await CategoryService.update(
    req.tenantId,
    req.params.gymId,
    req.params.categoryId,
    req.body
  );
  successResponse(res, category, 'Category updated successfully');
});

export const remove = asyncHandler(async (req, res) => {
  const result = await CategoryService.remove(
    req.tenantId,
    req.params.gymId,
    req.params.categoryId
  );
  successResponse(res, result);
});
