import { Router } from 'express';
import * as GymOwnerController from '../controllers/GymOwnerController.js';
import { validate } from '../middlewares/validate.middleware.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { requireRoles } from '../middlewares/rbac.middleware.js';
import {
  listGymOwnersQuerySchema,
  updateOwnerStatusSchema,
} from '../validators/invite.validator.js';

const router = Router();

router.use(authenticate, requireRoles('SUPER_ADMIN'));

router.get('/', validate(listGymOwnersQuerySchema), GymOwnerController.list);
router.patch('/:id/status', validate(updateOwnerStatusSchema), GymOwnerController.updateStatus);

export default router;
