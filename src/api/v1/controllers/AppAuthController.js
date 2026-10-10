import * as AppAuthService from '../services/AppAuthService.js';
import { successResponse } from '../../../utils/response.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';

export const login = asyncHandler(async (req, res) => {
  const data = await AppAuthService.login(req.body, req);
  successResponse(res, data, data.requiresTwoFactor ? 'Two-factor required' : 'Logged in');
});

export const verifyTwoFactor = asyncHandler(async (req, res) => {
  const data = await AppAuthService.verifyTwoFactor(req.body, req);
  successResponse(res, data, 'Logged in');
});

export const refresh = asyncHandler(async (req, res) => {
  const data = await AppAuthService.refresh(req.body);
  successResponse(res, data, 'Token refreshed');
});

export const logout = asyncHandler(async (req, res) => {
  const data = await AppAuthService.logout(req.body);
  successResponse(res, data, data.message || 'Logged out');
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const data = await AppAuthService.forgotPassword(req.body);
  successResponse(res, data, data.message || 'If the email exists, a reset link has been sent');
});

export const resetPassword = asyncHandler(async (req, res) => {
  const data = await AppAuthService.resetPassword(req.body);
  successResponse(res, data, 'Password updated');
});

export const verifyOtp = asyncHandler(async (req, res) => {
  const data = await AppAuthService.verifyOtp(req.body);
  successResponse(res, data, 'OTP verified');
});

export const changePassword = asyncHandler(async (req, res) => {
  const data = await AppAuthService.changePassword(req.user.id, req.body);
  successResponse(res, data, 'Password updated');
});

export const me = asyncHandler(async (req, res) => {
  const data = await AppAuthService.me(req.user.id);
  successResponse(res, data);
});
