import * as InviteService from '../services/InviteService.js';
import { successResponse } from '../utils/response.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const listPlans = asyncHandler(async (_req, res) => {
  const plans = await InviteService.listPlans();
  successResponse(res, { plans });
});

export const list = asyncHandler(async (req, res) => {
  const result = await InviteService.listInvites(req.query);
  successResponse(res, result);
});

export const create = asyncHandler(async (req, res) => {
  const invite = await InviteService.createInvite(req.user.id, req.body);
  successResponse(res, { invite, link: InviteService.getInviteLink(invite.token) }, 'Invite created', 201);
});

export const markSent = asyncHandler(async (req, res) => {
  const invite = await InviteService.markSent(req.params.id);
  successResponse(res, { invite, link: InviteService.getInviteLink(invite.token) });
});

export const revoke = asyncHandler(async (req, res) => {
  const invite = await InviteService.revoke(req.params.id);
  successResponse(res, { invite });
});

export const getByToken = asyncHandler(async (req, res) => {
  const invite = await InviteService.getPublicInvite(req.params.token);
  successResponse(res, { invite });
});

export const checkout = asyncHandler(async (req, res) => {
  const checkoutData = await InviteService.createCheckout(req.params.token, req.body);
  successResponse(res, checkoutData);
});

export const verifyPayment = asyncHandler(async (req, res) => {
  const result = await InviteService.verifyPaymentAndProvision(req.params.token, req.body);
  successResponse(res, result);
});
