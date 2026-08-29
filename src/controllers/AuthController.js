import * as AuthService from '../services/AuthService.js';
import { successResponse } from '../utils/response.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const register = asyncHandler(async (req, res) => {
  const result = await AuthService.register(req.body);
  successResponse(res, result, 'Registration successful', 201);
});

export const login = asyncHandler(async (req, res) => {
  const result = await AuthService.login(req.body);
  successResponse(res, result, 'Login successful');
});

export const refresh = asyncHandler(async (req, res) => {
  const result = await AuthService.refresh(req.body.refreshToken);
  successResponse(res, result, 'Token refreshed');
});

export const logout = asyncHandler(async (req, res) => {
  const result = await AuthService.logout(req.body.refreshToken);
  successResponse(res, result);
});

export const profile = asyncHandler(async (req, res) => {
  const user = await AuthService.getProfile(req.user.id);
  successResponse(res, user);
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const result = await AuthService.forgotPassword(req.body.email);
  successResponse(res, result);
});

export const resetPassword = asyncHandler(async (req, res) => {
  const result = await AuthService.resetPassword(req.body);
  successResponse(res, result);
});

export const verifyOtp = asyncHandler(async (req, res) => {
  const result = await AuthService.verifyOtp(req.body);
  successResponse(res, result);
});
