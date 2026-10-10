import { Router } from 'express';
import * as MemberCareController from '../controllers/MemberCareController.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { resolveTenant } from '../middlewares/tenant.middleware.js';
import { requireRoles } from '../middlewares/rbac.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  memberCareParamsSchema,
  workoutBodySchema,
  workoutUpdateSchema,
  workoutParamsSchema,
  dietBodySchema,
  dietUpdateSchema,
  dietParamsSchema,
  measurementBodySchema,
  measurementParamsSchema,
} from '../validators/memberCare.validator.js';

const router = Router({ mergeParams: true });
router.use(authenticate, resolveTenant);
const roles = ['SUPER_ADMIN', 'GYM_OWNER', 'MANAGER', 'TRAINER'];

router.get(
  '/:gymId/members/:memberId/care',
  requireRoles(...roles, 'RECEPTIONIST'),
  validate(memberCareParamsSchema),
  MemberCareController.listPlans
);
router.post(
  '/:gymId/members/:memberId/workouts',
  requireRoles(...roles),
  validate(workoutBodySchema),
  MemberCareController.createWorkout
);
router.put(
  '/:gymId/members/:memberId/workouts/:planId',
  requireRoles(...roles),
  validate(workoutUpdateSchema),
  MemberCareController.updateWorkout
);
router.delete(
  '/:gymId/members/:memberId/workouts/:planId',
  requireRoles(...roles),
  validate(workoutParamsSchema),
  MemberCareController.removeWorkout
);
router.post(
  '/:gymId/members/:memberId/diets',
  requireRoles(...roles),
  validate(dietBodySchema),
  MemberCareController.createDiet
);
router.put(
  '/:gymId/members/:memberId/diets/:planId',
  requireRoles(...roles),
  validate(dietUpdateSchema),
  MemberCareController.updateDiet
);
router.delete(
  '/:gymId/members/:memberId/diets/:planId',
  requireRoles(...roles),
  validate(dietParamsSchema),
  MemberCareController.removeDiet
);
router.post(
  '/:gymId/members/:memberId/measurements',
  requireRoles(...roles, 'RECEPTIONIST'),
  validate(measurementBodySchema),
  MemberCareController.createMeasurement
);
router.delete(
  '/:gymId/members/:memberId/measurements/:measurementId',
  requireRoles(...roles),
  validate(measurementParamsSchema),
  MemberCareController.removeMeasurement
);

export default router;
