import { Router } from 'express';
import * as PlanController from '../controllers/MembershipPlanController.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { resolveTenant } from '../middlewares/tenant.middleware.js';
import { requireRoles } from '../middlewares/rbac.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  createPlanSchema,
  updatePlanSchema,
  planParamsSchema,
} from '../validators/membershipPlan.validator.js';
import { gymIdParamSchema } from '../validators/gym.validator.js';

const router = Router({ mergeParams: true });
router.use(authenticate, resolveTenant);
const roles = ['SUPER_ADMIN', 'GYM_OWNER', 'MANAGER'];

router.get('/:gymId/membership-plans', requireRoles(...roles), validate(gymIdParamSchema), PlanController.list);
router.post('/:gymId/membership-plans', requireRoles(...roles), validate(createPlanSchema), PlanController.create);
router.get('/:gymId/membership-plans/:planId', requireRoles(...roles), validate(planParamsSchema), PlanController.getById);
router.put('/:gymId/membership-plans/:planId', requireRoles(...roles), validate(updatePlanSchema), PlanController.update);
router.delete('/:gymId/membership-plans/:planId', requireRoles('SUPER_ADMIN', 'GYM_OWNER', 'MANAGER'), validate(planParamsSchema), PlanController.remove);

export default router;
