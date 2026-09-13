import * as AppPublishService from '../services/AppPublishService.js';
import { successResponse } from '../utils/response.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getPublish = asyncHandler(async (req, res) => {
  const data = await AppPublishService.getPublishByInvite(req.params.id);
  successResponse(res, data);
});

export const updatePublish = asyncHandler(async (req, res) => {
  const publish = await AppPublishService.updatePublishByInvite(req.params.id, req.body);
  successResponse(res, { publish }, 'App publish settings saved');
});
