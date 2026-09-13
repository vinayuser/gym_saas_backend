import * as MemberPortalService from '../services/MemberPortalService.js';
import { successResponse } from '../utils/response.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const me = asyncHandler(async (req, res) => {
  const data = await MemberPortalService.getMyMemberProfile(req.user.id);
  successResponse(res, data);
});

export const attendance = asyncHandler(async (req, res) => {
  const data = await MemberPortalService.getMyAttendance(req.user.id, req.query);
  successResponse(res, data);
});
