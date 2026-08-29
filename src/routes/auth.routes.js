import { Router } from 'express';
import * as AuthController from '../controllers/AuthController.js';
import { validate } from '../middlewares/validate.middleware.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyOtpSchema,
  changePasswordSchema,
  twoFactorVerifySchema,
  twoFactorDisableSchema,
  twoFactorLoginSchema,
  revokeSessionSchema,
  revokeOtherSessionsSchema,
  notificationPreferencesSchema,
} from '../validators/auth.validator.js';

const router = Router();

router.post('/register', validate(registerSchema), AuthController.register);
router.post('/login', validate(loginSchema), AuthController.login);
router.post('/login/2fa', validate(twoFactorLoginSchema), AuthController.verifyTwoFactorLogin);
router.post('/refresh', validate(refreshTokenSchema), AuthController.refresh);
router.post('/logout', validate(refreshTokenSchema), AuthController.logout);
router.post('/forgot-password', validate(forgotPasswordSchema), AuthController.forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), AuthController.resetPassword);
router.post('/verify-otp', validate(verifyOtpSchema), AuthController.verifyOtp);
router.get('/me', authenticate, AuthController.profile);

router.patch('/password', authenticate, validate(changePasswordSchema), AuthController.changePassword);
router.get('/sessions', authenticate, AuthController.listSessions);
router.delete('/sessions/:sessionId', authenticate, validate(revokeSessionSchema), AuthController.revokeSession);
router.post('/sessions/revoke-others', authenticate, validate(revokeOtherSessionsSchema), AuthController.revokeOtherSessions);

router.get('/2fa/status', authenticate, AuthController.getTwoFactorStatus);
router.post('/2fa/setup', authenticate, AuthController.setupTwoFactor);
router.post('/2fa/verify', authenticate, validate(twoFactorVerifySchema), AuthController.verifyTwoFactorSetup);
router.post('/2fa/disable', authenticate, validate(twoFactorDisableSchema), AuthController.disableTwoFactor);

router.patch(
  '/notification-preferences',
  authenticate,
  validate(notificationPreferencesSchema),
  AuthController.updateNotificationPreferences
);

export default router;
