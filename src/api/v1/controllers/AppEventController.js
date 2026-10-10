import * as AppEventService from '../services/AppEventService.js';
import { successResponse } from '../../../utils/response.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';

export const list = asyncHandler(async (req, res) => {
  const data = await AppEventService.listEvents(req.member, req.query);
  successResponse(res, data);
});

export const detail = asyncHandler(async (req, res) => {
  const data = await AppEventService.getEvent(req.member, req.memberGym, req.params.eventId);
  successResponse(res, data);
});

export const book = asyncHandler(async (req, res) => {
  const data = await AppEventService.bookEvent(req.member, req.memberGym, req.params.eventId);
  successResponse(res, data, 'Class joined', 201);
});

export const cancel = asyncHandler(async (req, res) => {
  const data = await AppEventService.cancelEvent(req.member, req.memberGym, req.params.eventId);
  successResponse(res, data, 'Booking cancelled');
});
