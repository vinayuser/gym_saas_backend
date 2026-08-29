import { Router } from 'express';
import * as StaffController from '../controllers/StaffController.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { resolveTenant } from '../middlewares/tenant.middleware.js';
import { requireRoles } from '../middlewares/rbac.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  createStaffSchema,
  updateStaffSchema,
  staffParamsSchema,
} from '../validators/staff.validator.js';
import { gymIdParamSchema } from '../validators/gym.validator.js';

const router = Router({ mergeParams: true });

router.use(authenticate, resolveTenant);

const managerRoles = ['SUPER_ADMIN', 'GYM_OWNER', 'MANAGER'];

router.get(
  '/:gymId/staff',
  requireRoles(...managerRoles, 'RECEPTIONIST'),
  validate(gymIdParamSchema),
  StaffController.list
);
router.post(
  '/:gymId/staff',
  requireRoles(...managerRoles),
  validate(createStaffSchema),
  StaffController.create
);
router.get(
  '/:gymId/staff/:staffId',
  requireRoles(...managerRoles, 'RECEPTIONIST'),
  validate(staffParamsSchema),
  StaffController.getById
);
router.put(
  '/:gymId/staff/:staffId',
  requireRoles(...managerRoles),
  validate(updateStaffSchema),
  StaffController.update
);
router.delete(
  '/:gymId/staff/:staffId',
  requireRoles('SUPER_ADMIN', 'GYM_OWNER', 'MANAGER'),
  validate(staffParamsSchema),
  StaffController.remove
);

export default router;
