import * as AppMemberService from '../services/AppMemberService.js';
import { successResponse } from '../../../utils/response.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';

export const home = asyncHandler(async (req, res) => {
  const data = await AppMemberService.getHome(req.member, req.memberGym);
  successResponse(res, data);
});

export const profile = asyncHandler(async (req, res) => {
  const data = await AppMemberService.getProfile(req.member, req.memberGym, req.user);
  successResponse(res, data);
});

export const updateProfile = asyncHandler(async (req, res) => {
  const data = await AppMemberService.updateProfile(req.member, req.memberGym, req.user, req.body);
  successResponse(res, data, 'Profile updated');
});

export const membership = asyncHandler(async (req, res) => {
  const data = await AppMemberService.getMembership(req.member);
  successResponse(res, data);
});

export const attendance = asyncHandler(async (req, res) => {
  const data = await AppMemberService.getAttendance(req.member, req.query);
  successResponse(res, data);
});

export const getSlot = asyncHandler(async (req, res) => {
  const data = await AppMemberService.getSlot(req.member);
  successResponse(res, data);
});

export const updateSlot = asyncHandler(async (req, res) => {
  const data = await AppMemberService.updateSlot(req.member, req.body);
  successResponse(res, data, 'Slot updated');
});

export const gymTiming = asyncHandler(async (req, res) => {
  const data = await AppMemberService.getGymTiming(req.member, req.memberGym);
  successResponse(res, data);
});

export const checkInPass = asyncHandler(async (req, res) => {
  const data = await AppMemberService.getCheckInPass(req.member, req.memberGym);
  successResponse(res, data);
});

export const refreshCheckInPass = asyncHandler(async (req, res) => {
  const data = await AppMemberService.refreshCheckInPass(req.member, req.memberGym);
  successResponse(res, data, 'QR refreshed');
});

export const notificationSettings = asyncHandler(async (req, res) => {
  const data = await AppMemberService.getNotificationSettings(req.user.id);
  successResponse(res, data);
});

export const updateNotificationSettings = asyncHandler(async (req, res) => {
  const data = await AppMemberService.updateNotificationSettings(req.user.id, req.body);
  successResponse(res, data, 'Settings saved');
});
