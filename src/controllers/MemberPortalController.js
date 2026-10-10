import * as MemberPortalService from '../services/MemberPortalService.js';
import { successResponse } from '../utils/response.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const me = asyncHandler(async (req, res) => {
  const data = await MemberPortalService.getMyMemberProfile(req.user.id);
  successResponse(res, data);
});

export const updateMe = asyncHandler(async (req, res) => {
  const data = await MemberPortalService.updateMyProfile(req.user.id, req.body);
  successResponse(res, data, 'Profile updated');
});

export const home = asyncHandler(async (req, res) => {
  const data = await MemberPortalService.home(req.user.id);
  successResponse(res, data);
});

export const attendance = asyncHandler(async (req, res) => {
  const data = await MemberPortalService.getMyAttendance(req.user.id, req.query);
  successResponse(res, data);
});

export const checkIn = asyncHandler(async (req, res) => {
  const data = await MemberPortalService.checkInSelf(req.user.id);
  successResponse(res, data, data.action === 'CHECK_OUT' ? 'Checked out' : 'Checked in', 201);
});

export const banners = asyncHandler(async (req, res) => {
  const data = await MemberPortalService.listBanners(req.user.id);
  successResponse(res, data);
});

export const events = asyncHandler(async (req, res) => {
  const data = await MemberPortalService.listEvents(req.user.id);
  successResponse(res, data);
});

export const bookEvent = asyncHandler(async (req, res) => {
  const data = await MemberPortalService.bookEvent(req.user.id, req.params.eventId);
  successResponse(res, data, 'Class booked', 201);
});

export const cancelEvent = asyncHandler(async (req, res) => {
  const data = await MemberPortalService.cancelEvent(req.user.id, req.params.eventId);
  successResponse(res, data);
});

export const bookings = asyncHandler(async (req, res) => {
  const data = await MemberPortalService.myBookings(req.user.id);
  successResponse(res, data);
});

export const products = asyncHandler(async (req, res) => {
  const data = await MemberPortalService.listProducts(req.user.id);
  successResponse(res, data);
});

export const placeOrder = asyncHandler(async (req, res) => {
  const data = await MemberPortalService.placeOrder(req.user.id, req.body);
  successResponse(res, data, 'Order placed', 201);
});

export const orders = asyncHandler(async (req, res) => {
  const data = await MemberPortalService.myOrders(req.user.id);
  successResponse(res, data);
});

export const plans = asyncHandler(async (req, res) => {
  const data = await MemberPortalService.myPlans(req.user.id);
  successResponse(res, data);
});

export const addMeasurement = asyncHandler(async (req, res) => {
  const data = await MemberPortalService.addMeasurement(req.user.id, req.body);
  successResponse(res, data, 'Measurement saved', 201);
});

export const chat = asyncHandler(async (req, res) => {
  const data = await MemberPortalService.gymChat(req.user.id, req.query.limit);
  successResponse(res, data);
});

export const sendChat = asyncHandler(async (req, res) => {
  const data = await MemberPortalService.sendChat(req.user.id, req.body);
  successResponse(res, data, 'Sent', 201);
});
