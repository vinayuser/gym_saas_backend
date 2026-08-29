import { Router } from 'express';
import * as ProductController from '../controllers/ProductController.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { resolveTenant } from '../middlewares/tenant.middleware.js';
import { requireRoles } from '../middlewares/rbac.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  createProductSchema,
  updateProductSchema,
  productParamsSchema,
} from '../validators/product.validator.js';
import { gymIdParamSchema } from '../validators/gym.validator.js';

const router = Router({ mergeParams: true });
router.use(authenticate, resolveTenant);
const roles = ['SUPER_ADMIN', 'GYM_OWNER', 'MANAGER', 'RECEPTIONIST'];

router.get('/:gymId/products/stats', requireRoles(...roles), validate(gymIdParamSchema), ProductController.stats);
router.get('/:gymId/products', requireRoles(...roles), validate(gymIdParamSchema), ProductController.list);
router.post('/:gymId/products', requireRoles(...roles), validate(createProductSchema), ProductController.create);
router.get('/:gymId/products/:productId', requireRoles(...roles), validate(productParamsSchema), ProductController.getById);
router.put('/:gymId/products/:productId', requireRoles(...roles), validate(updateProductSchema), ProductController.update);
router.delete('/:gymId/products/:productId', requireRoles('SUPER_ADMIN', 'GYM_OWNER', 'MANAGER'), validate(productParamsSchema), ProductController.remove);

export default router;
