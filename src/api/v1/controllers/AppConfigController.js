import * as AppConfigService from '../services/AppConfigService.js';
import { successResponse } from '../../../utils/response.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';

export const config = asyncHandler(async (req, res) => {
  const data = await AppConfigService.getConfig(req.query);
  successResponse(res, data);
});
