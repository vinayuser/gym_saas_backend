import * as AppTrainerService from '../services/AppTrainerService.js';
import { successResponse } from '../../../utils/response.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';

export const list = asyncHandler(async (req, res) => {
  const data = await AppTrainerService.listTrainers(req.member, req.query);
  successResponse(res, data);
});

export const detail = asyncHandler(async (req, res) => {
  const data = await AppTrainerService.getTrainer(req.member, req.params.trainerId);
  successResponse(res, data);
});
