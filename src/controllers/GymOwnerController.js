import * as GymOwnerService from '../services/GymOwnerService.js';
import { successResponse } from '../utils/response.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { NotFoundError } from '../utils/errors.js';

export const list = asyncHandler(async (req, res) => {
  const result = await GymOwnerService.listGymOwners(req.query);
  successResponse(res, result);
});

export const updateStatus = asyncHandler(async (req, res) => {
  const owner = await GymOwnerService.updateOwnerStatus(req.params.id, req.body.status);
  if (!owner) throw new NotFoundError('Gym owner not found');
  successResponse(res, { owner });
});
