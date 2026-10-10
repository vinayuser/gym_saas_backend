import * as BroadcastService from '../services/BroadcastService.js';
import { successResponse } from '../utils/response.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getActive = asyncHandler(async (_req, res) => {
  const data = await BroadcastService.getActive();
  successResponse(res, data);
});

export const create = asyncHandler(async (req, res) => {
  const data = await BroadcastService.create(req.user.id, req.body.message);
  successResponse(res, data, 'Broadcast is live', 201);
});

export const removeActive = asyncHandler(async (_req, res) => {
  const data = await BroadcastService.removeActive();
  successResponse(res, data, 'Broadcast removed');
});
