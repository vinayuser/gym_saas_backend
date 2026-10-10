import { Router } from 'express';
import { validate } from '../../../middlewares/validate.middleware.js';
import { memberAuth } from '../middleware/memberAuth.js';
import * as AppNotificationController from '../controllers/AppNotificationController.js';
import { markReadSchema } from '../validators/app.validator.js';

const router = Router();
router.use(...memberAuth);

router.get('/', AppNotificationController.list);
router.post('/mark-read', validate(markReadSchema), AppNotificationController.markRead);
router.get('/:notificationId', AppNotificationController.detail);

export default router;
