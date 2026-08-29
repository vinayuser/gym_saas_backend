import * as OrderService from '../services/OrderService.js';
import { successResponse, paginatedResponse } from '../utils/response.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const list = asyncHandler(async (req, res) => {
  const result = await OrderService.list(req.tenantId, req.params.gymId, req.query);
  paginatedResponse(res, result.orders, result.pagination);
});

export const stats = asyncHandler(async (req, res) => {
  const data = await OrderService.stats(req.tenantId, req.params.gymId);
  successResponse(res, data);
});

export const getById = asyncHandler(async (req, res) => {
  const order = await OrderService.getById(req.tenantId, req.params.gymId, req.params.orderId);
  successResponse(res, order);
});

export const create = asyncHandler(async (req, res) => {
  const order = await OrderService.create(req.tenantId, req.params.gymId, req.body);
  successResponse(res, order, 201);
});

export const updateStatus = asyncHandler(async (req, res) => {
  const order = await OrderService.updateStatus(
    req.tenantId,
    req.params.gymId,
    req.params.orderId,
    req.body
  );
  successResponse(res, order);
});

export const listForMember = asyncHandler(async (req, res) => {
  const result = await OrderService.listForMember(
    req.tenantId,
    req.params.gymId,
    req.params.memberId,
    req.query
  );
  paginatedResponse(res, result.orders, result.pagination);
});
