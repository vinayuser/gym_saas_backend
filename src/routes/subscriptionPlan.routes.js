import { Router } from 'express';
import * as SubscriptionPlanController from '../controllers/SubscriptionPlanController.js';
import { validate } from '../middlewares/validate.middleware.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { requireRoles } from '../middlewares/rbac.middleware.js';
import {
  listPlansQuerySchema,
  planIdParamSchema,
  updatePlanSchema,
} from '../validators/subscriptionPlan.validator.js';

const router = Router();

router.use(authenticate, requireRoles('SUPER_ADMIN'));

router.get('/', validate(listPlansQuerySchema), SubscriptionPlanController.list);
router.get('/:id', validate(planIdParamSchema), SubscriptionPlanController.getById);
router.patch('/:id', validate(updatePlanSchema), SubscriptionPlanController.update);

export default router;
