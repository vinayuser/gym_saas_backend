import * as AppChatService from '../services/AppChatService.js';
import { successResponse } from '../../../utils/response.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';

export const list = asyncHandler(async (req, res) => {
  const data = await AppChatService.listMessages(req.member, req.user.id, req.query);
  successResponse(res, data);
});

export const send = asyncHandler(async (req, res) => {
  const data = await AppChatService.sendMessage(req.member, req.user.id, req.body);
  successResponse(res, data, 'Sent', 201);
});
