import * as NotificationService from '../services/NotificationService.js';
import { successResponse } from '../utils/response.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const list = asyncHandler(async (req, res) => {
  const data = await NotificationService.listNotifications(req.user);
  successResponse(res, data);
});
