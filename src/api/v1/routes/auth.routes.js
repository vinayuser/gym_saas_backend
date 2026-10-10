import { Router } from 'express';
import { validate } from '../../../middlewares/validate.middleware.js';
import { memberAuthOptionalContext } from '../middleware/memberAuth.js';
import * as AppAuthController from '../controllers/AppAuthController.js';
import {
  loginSchema,
  refreshSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyOtpSchema,
  twoFactorSchema,
  changePasswordSchema,
} from '../validators/app.validator.js';

const router = Router();

router.post('/login', validate(loginSchema), AppAuthController.login);
router.post('/login/2fa', validate(twoFactorSchema), AppAuthController.verifyTwoFactor);
router.post('/refresh', validate(refreshSchema), AppAuthController.refresh);
router.post('/logout', validate(refreshSchema), AppAuthController.logout);
router.post('/forgot-password', validate(forgotPasswordSchema), AppAuthController.forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), AppAuthController.resetPassword);
router.post('/verify-otp', validate(verifyOtpSchema), AppAuthController.verifyOtp);
router.post(
  '/change-password',
  ...memberAuthOptionalContext,
  validate(changePasswordSchema),
  AppAuthController.changePassword
);
router.get('/me', ...memberAuthOptionalContext, AppAuthController.me);

export default router;
