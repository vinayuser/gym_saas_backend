import { Router } from 'express';
import * as GymOwnerController from '../controllers/GymOwnerController.js';
import { validate } from '../middlewares/validate.middleware.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { requirePlatform } from '../middlewares/rbac.middleware.js';
import {
  listGymOwnersQuerySchema,
  resetOwnerPasswordSchema,
  updateOwnerStatusSchema,
} from '../validators/invite.validator.js';

const router = Router();

router.use(authenticate);

router.get('/', requirePlatform('businesses.view', 'dashboard.view'), validate(listGymOwnersQuerySchema), GymOwnerController.list);
router.patch('/:id/status', requirePlatform('businesses.manage'), validate(updateOwnerStatusSchema), GymOwnerController.updateStatus);
router.patch('/:id/password', requirePlatform('businesses.manage'), validate(resetOwnerPasswordSchema), GymOwnerController.resetPassword);

export default router;
