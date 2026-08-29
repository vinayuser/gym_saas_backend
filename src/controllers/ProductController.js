import * as ProductService from '../services/ProductService.js';
import { successResponse, paginatedResponse } from '../utils/response.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const list = asyncHandler(async (req, res) => {
  const result = await ProductService.list(req.tenantId, req.params.gymId, req.query);
  paginatedResponse(res, result.products, result.pagination);
});

export const stats = asyncHandler(async (req, res) => {
  const data = await ProductService.stats(req.tenantId, req.params.gymId);
  successResponse(res, data);
});

export const getById = asyncHandler(async (req, res) => {
  const product = await ProductService.getById(
    req.tenantId,
    req.params.gymId,
    req.params.productId
  );
  successResponse(res, product);
});

export const create = asyncHandler(async (req, res) => {
  const product = await ProductService.create(req.tenantId, req.params.gymId, req.body);
  successResponse(res, product, 'Product created successfully', 201);
});

export const update = asyncHandler(async (req, res) => {
  const product = await ProductService.update(
    req.tenantId,
    req.params.gymId,
    req.params.productId,
    req.body
  );
  successResponse(res, product, 'Product updated successfully');
});

export const remove = asyncHandler(async (req, res) => {
  const result = await ProductService.remove(
    req.tenantId,
    req.params.gymId,
    req.params.productId
  );
  successResponse(res, result);
});
