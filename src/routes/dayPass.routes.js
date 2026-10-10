import { Router } from 'express';
import * as DayPassController from '../controllers/DayPassController.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { resolveTenant } from '../middlewares/tenant.middleware.js';
import { requireRoles } from '../middlewares/rbac.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  listDayPassSchema,
  createDayPassSchema,
  dayPassParamsSchema,
} from '../validators/dayPass.validator.js';

const router = Router({ mergeParams: true });
router.use(authenticate, resolveTenant);
const roles = ['SUPER_ADMIN', 'GYM_OWNER', 'MANAGER', 'RECEPTIONIST'];

router.get('/:gymId/day-passes', requireRoles(...roles), validate(listDayPassSchema), DayPassController.list);
router.post('/:gymId/day-passes', requireRoles(...roles), validate(createDayPassSchema), DayPassController.create);
router.post(
  '/:gymId/day-passes/:passId/check-in',
  requireRoles(...roles),
  validate(dayPassParamsSchema),
  DayPassController.checkIn
);

export default router;
