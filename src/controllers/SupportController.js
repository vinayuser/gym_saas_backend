import * as SupportService from '../services/SupportService.js';
import { successResponse } from '../utils/response.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const create = asyncHandler(async (req, res) => {
  const ticket = await SupportService.create(req.user, req.body);
  successResponse(
    res,
    { ticket },
    ticket.emailSent
      ? 'Support request sent — check your inbox for confirmation'
      : 'Support request saved — our team will follow up shortly',
    201
  );
});

export const list = asyncHandler(async (req, res) => {
  const data = await SupportService.list(req.user, req.query);
  successResponse(res, data);
});

export const updateStatus = asyncHandler(async (req, res) => {
  const ticket = await SupportService.updateStatus(req.user, req.params.ticketId, req.body.status);
  successResponse(res, { ticket }, 'Ticket status updated');
});
