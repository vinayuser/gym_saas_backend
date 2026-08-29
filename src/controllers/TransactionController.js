import * as TransactionService from '../services/TransactionService.js';
import { successResponse } from '../utils/response.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { NotFoundError } from '../utils/errors.js';

export const list = asyncHandler(async (req, res) => {
  const result = await TransactionService.listTransactions(req.query);
  successResponse(res, result);
});

export const getById = asyncHandler(async (req, res) => {
  const transaction = await TransactionService.getTransactionById(req.params.id);
  if (!transaction) throw new NotFoundError('Transaction not found');
  successResponse(res, { transaction });
});
