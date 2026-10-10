import * as AppDayPassService from '../services/AppDayPassService.js';
import { successResponse } from '../../../utils/response.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';

export const partnerGyms = asyncHandler(async (req, res) => {
  const data = await AppDayPassService.listPartnerGyms(req.member, req.memberGym, req.query);
  successResponse(res, data);
});

export const partnerGymDetail = asyncHandler(async (req, res) => {
  const data = await AppDayPassService.getPartnerGym(req.member, req.memberGym, req.params.gymId);
  successResponse(res, data);
});

export const availability = asyncHandler(async (req, res) => {
  const data = await AppDayPassService.getAvailability(
    req.member,
    req.memberGym,
    req.params.gymId,
    req.query
  );
  successResponse(res, data);
});

export const checkout = asyncHandler(async (req, res) => {
  const data = await AppDayPassService.checkout(req.member, req.memberGym, req.body);
  successResponse(res, data, 'Checkout created', 201);
});

export const verifyPayment = asyncHandler(async (req, res) => {
  const data = await AppDayPassService.verifyPayment(req.member, req.memberGym, req.body);
  successResponse(res, data, data.success ? 'Booking confirmed' : 'Payment failed');
});

export const list = asyncHandler(async (req, res) => {
  const data = await AppDayPassService.listMyDayPasses(req.member);
  successResponse(res, data);
});

export const detail = asyncHandler(async (req, res) => {
  const data = await AppDayPassService.getDayPass(req.member, req.params.passId);
  successResponse(res, data);
});
