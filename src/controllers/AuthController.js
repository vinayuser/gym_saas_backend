import * as AuthService from '../services/AuthService.js';
import { successResponse } from '../utils/response.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const register = asyncHandler(async (req, res) => {
  const result = await AuthService.register(req.body);
  successResponse(res, result, 'Registration successful', 201);
});

export const login = asyncHandler(async (req, res) => {
  const sessionMeta = { ipAddress: req.ip, userAgent: req.get('user-agent') };
  const result = await AuthService.login(req.body, sessionMeta);
  successResponse(res, result, result.requiresTwoFactor ? 'Two-factor authentication required' : 'Login successful');
});

export const verifyTwoFactorLogin = asyncHandler(async (req, res) => {
  const sessionMeta = { ipAddress: req.ip, userAgent: req.get('user-agent') };
  const result = await AuthService.verifyTwoFactorLogin(req.body, sessionMeta);
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

export const changePassword = asyncHandler(async (req, res) => {
  const result = await AuthService.changePassword(req.user.id, req.body);
  successResponse(res, result);
});

export const listSessions = asyncHandler(async (req, res) => {
  const currentRefreshToken = req.query.refreshToken || req.body?.refreshToken;
  const result = await AuthService.listSessions(req.user.id, currentRefreshToken);
  successResponse(res, result);
});

export const revokeSession = asyncHandler(async (req, res) => {
  const currentRefreshToken = req.query.refreshToken || req.body?.refreshToken;
  const result = await AuthService.revokeSession(req.user.id, req.params.sessionId, currentRefreshToken);
  successResponse(res, result);
});

export const revokeOtherSessions = asyncHandler(async (req, res) => {
  const result = await AuthService.revokeOtherSessions(req.user.id, req.body.refreshToken);
  successResponse(res, result);
});

export const getTwoFactorStatus = asyncHandler(async (req, res) => {
  const result = await AuthService.getTwoFactorStatus(req.user.id);
  successResponse(res, result);
});

export const setupTwoFactor = asyncHandler(async (req, res) => {
  const result = await AuthService.setupTwoFactor(req.user.id);
  successResponse(res, result);
});

export const verifyTwoFactorSetup = asyncHandler(async (req, res) => {
  const result = await AuthService.verifyTwoFactorSetup(req.user.id, req.body.code);
  successResponse(res, result);
});

export const disableTwoFactor = asyncHandler(async (req, res) => {
  const result = await AuthService.disableTwoFactor(req.user.id, req.body);
  successResponse(res, result);
});

export const updateNotificationPreferences = asyncHandler(async (req, res) => {
  const result = await AuthService.updateNotificationPreferences(req.user.id, req.body);
  successResponse(res, result);
});
