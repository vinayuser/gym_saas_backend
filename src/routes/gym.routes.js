import { Router } from 'express';
import * as GymController from '../controllers/GymController.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { resolveTenant } from '../middlewares/tenant.middleware.js';
import { requireRoles } from '../middlewares/rbac.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  createGymSchema,
  updateGymSchema,
  gymIdParamSchema,
} from '../validators/gym.validator.js';

const router = Router();

router.use(authenticate, resolveTenant);

router.get('/', requireRoles('SUPER_ADMIN', 'GYM_OWNER', 'MANAGER', 'RECEPTIONIST'), GymController.list);
router.post('/', requireRoles('SUPER_ADMIN', 'GYM_OWNER'), validate(createGymSchema), GymController.create);
router.get(
  '/:gymId/dashboard',
  requireRoles('SUPER_ADMIN', 'GYM_OWNER', 'MANAGER', 'RECEPTIONIST'),
  validate(gymIdParamSchema),
  GymController.dashboard
);
router.get('/:gymId', requireRoles('SUPER_ADMIN', 'GYM_OWNER', 'MANAGER', 'RECEPTIONIST', 'TRAINER'), validate(gymIdParamSchema), GymController.getById);
router.put('/:gymId', requireRoles('SUPER_ADMIN', 'GYM_OWNER', 'MANAGER'), validate(updateGymSchema), GymController.update);
router.delete('/:gymId', requireRoles('SUPER_ADMIN', 'GYM_OWNER'), validate(gymIdParamSchema), GymController.remove);

export default router;
