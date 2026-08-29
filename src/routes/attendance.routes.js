import { Router } from 'express';
import * as AttendanceController from '../controllers/AttendanceController.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { resolveTenant } from '../middlewares/tenant.middleware.js';
import { requireRoles } from '../middlewares/rbac.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { checkInSchema } from '../validators/attendance.validator.js';
import { gymIdParamSchema } from '../validators/gym.validator.js';

const router = Router({ mergeParams: true });
router.use(authenticate, resolveTenant);
const roles = ['SUPER_ADMIN', 'GYM_OWNER', 'MANAGER', 'RECEPTIONIST'];

router.get('/:gymId/attendance', requireRoles(...roles), validate(gymIdParamSchema), AttendanceController.list);
router.post('/:gymId/attendance/check-in', requireRoles(...roles), validate(checkInSchema), AttendanceController.checkIn);

export default router;
