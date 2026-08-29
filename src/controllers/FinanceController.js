import * as FinanceService from '../services/FinanceService.js';
import { successResponse, paginatedResponse } from '../utils/response.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const overview = asyncHandler(async (req, res) => {
  const data = await FinanceService.overview(req.tenantId, req.params.gymId, req.query);
  successResponse(res, data);
});

export const ledger = asyncHandler(async (req, res) => {
  const result = await FinanceService.ledger(req.tenantId, req.params.gymId, req.query);
  paginatedResponse(res, result.entries, result.pagination);
});

export const payments = asyncHandler(async (req, res) => {
  const result = await FinanceService.payments(req.tenantId, req.params.gymId, req.query);
  paginatedResponse(res, result.rows, result.pagination);
});

export const expenses = asyncHandler(async (req, res) => {
  const data = await FinanceService.expenses(req.tenantId, req.params.gymId, req.query);
  successResponse(res, data);
});

export const reports = asyncHandler(async (req, res) => {
  const data = await FinanceService.reports(req.tenantId, req.params.gymId, req.query);
  successResponse(res, data);
});
