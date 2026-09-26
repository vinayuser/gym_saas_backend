import { Router } from 'express';
import * as SubscriptionPlanController from '../controllers/SubscriptionPlanController.js';
import { validate } from '../middlewares/validate.middleware.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { requirePlatform } from '../middlewares/rbac.middleware.js';
import {
  listPlansQuerySchema,
  planIdParamSchema,
  updatePlanSchema,
} from '../validators/subscriptionPlan.validator.js';

const router = Router();

router.use(authenticate);

router.get('/', requirePlatform('plans.view'), validate(listPlansQuerySchema), SubscriptionPlanController.list);
router.get('/:id', requirePlatform('plans.view'), validate(planIdParamSchema), SubscriptionPlanController.getById);
router.patch('/:id', requirePlatform('plans.manage'), validate(updatePlanSchema), SubscriptionPlanController.update);

export default router;
