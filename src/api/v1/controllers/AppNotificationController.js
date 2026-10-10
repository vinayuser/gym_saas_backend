import * as AppNotificationService from '../services/AppNotificationService.js';
import { successResponse } from '../../../utils/response.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';

export const list = asyncHandler(async (req, res) => {
  const data = await AppNotificationService.listNotifications(req.member, req.user.id);
  successResponse(res, data);
});

export const detail = asyncHandler(async (req, res) => {
  const data = await AppNotificationService.getNotification(req.user.id, req.params.notificationId);
  successResponse(res, data);
});

export const markRead = asyncHandler(async (req, res) => {
  const data = await AppNotificationService.markRead(req.user.id, req.body);
  successResponse(res, data, 'Marked as read');
});
