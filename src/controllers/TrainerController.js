import * as TrainerService from '../services/TrainerService.js';
import { successResponse } from '../utils/response.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const performance = asyncHandler(async (req, res) => {
  const data = await TrainerService.performance(req.tenantId, req.params.gymId);
  successResponse(res, data);
});
