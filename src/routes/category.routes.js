import { Router } from 'express';
import * as CategoryController from '../controllers/CategoryController.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { resolveTenant } from '../middlewares/tenant.middleware.js';
import { requireRoles } from '../middlewares/rbac.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  createCategorySchema,
  updateCategorySchema,
  categoryParamsSchema,
} from '../validators/category.validator.js';
import { gymIdParamSchema } from '../validators/gym.validator.js';

const router = Router({ mergeParams: true });
router.use(authenticate, resolveTenant);
const roles = ['SUPER_ADMIN', 'GYM_OWNER', 'MANAGER', 'RECEPTIONIST'];

router.get('/:gymId/categories', requireRoles(...roles), validate(gymIdParamSchema), CategoryController.list);
router.post('/:gymId/categories', requireRoles(...roles), validate(createCategorySchema), CategoryController.create);
router.put(
  '/:gymId/categories/:categoryId',
  requireRoles(...roles),
  validate(updateCategorySchema),
  CategoryController.update
);
router.delete(
  '/:gymId/categories/:categoryId',
  requireRoles('SUPER_ADMIN', 'GYM_OWNER', 'MANAGER'),
  validate(categoryParamsSchema),
  CategoryController.remove
);

export default router;
