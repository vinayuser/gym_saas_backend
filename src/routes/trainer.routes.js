import { Router } from 'express';
import * as TrainerController from '../controllers/TrainerController.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { resolveTenant } from '../middlewares/tenant.middleware.js';
import { requireRoles } from '../middlewares/rbac.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { z } from 'zod';
import { gymIdParamSchema } from '../validators/gym.validator.js';

const trainerIdParamSchema = z.object({
  params: z.object({
    gymId: z.string().uuid(),
    trainerId: z.string().uuid(),
  }),
});

const router = Router({ mergeParams: true });
router.use(authenticate, resolveTenant);

router.get(
  '/:gymId/trainers/performance',
  requireRoles('SUPER_ADMIN', 'GYM_OWNER', 'MANAGER'),
  validate(gymIdParamSchema),
  TrainerController.performance
);

router.get(
  '/:gymId/trainers/:trainerId',
  requireRoles('SUPER_ADMIN', 'GYM_OWNER', 'MANAGER'),
  validate(trainerIdParamSchema),
  TrainerController.getById
);

export default router;
