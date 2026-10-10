import { Router } from 'express';
import { validate } from '../../../middlewares/validate.middleware.js';
import { memberAuth } from '../middleware/memberAuth.js';
import * as AppMemberController from '../controllers/AppMemberController.js';
import {
  updateProfileSchema,
  updateSlotSchema,
  notificationSettingsSchema,
} from '../validators/app.validator.js';

const router = Router();

router.use(...memberAuth);

router.get('/home', AppMemberController.home);
router.get('/me', AppMemberController.profile);
router.patch('/me', validate(updateProfileSchema), AppMemberController.updateProfile);
router.get('/me/membership', AppMemberController.membership);
router.get('/me/attendance', AppMemberController.attendance);
router.get('/me/slot', AppMemberController.getSlot);
router.patch('/me/slot', validate(updateSlotSchema), AppMemberController.updateSlot);
router.get('/me/notification-settings', AppMemberController.notificationSettings);
router.patch(
  '/me/notification-settings',
  validate(notificationSettingsSchema),
  AppMemberController.updateNotificationSettings
);
router.get('/me/check-in-pass', AppMemberController.checkInPass);
router.post('/me/check-in-pass/refresh', AppMemberController.refreshCheckInPass);
router.get('/gym/timing', AppMemberController.gymTiming);

export default router;
