import { Router } from 'express';
import * as TenantController from '../controllers/TenantController.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { resolveTenant } from '../middlewares/tenant.middleware.js';
import { requireRoles } from '../middlewares/rbac.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  listTenantsQuerySchema,
  updateTenantStatusSchema,
  updateTenantFeaturesSchema,
} from '../validators/tenant.validator.js';

const router = Router();

router.use(authenticate);

/** Super admin — platform tenant directory */
router.get(
  '/',
  requireRoles('SUPER_ADMIN'),
  validate(listTenantsQuerySchema),
  TenantController.list
);
router.patch(
  '/:id/status',
  requireRoles('SUPER_ADMIN'),
  validate(updateTenantStatusSchema),
  TenantController.updateStatus
);
router.patch(
  '/:id/features',
  requireRoles('SUPER_ADMIN'),
  validate(updateTenantFeaturesSchema),
  TenantController.updateFeatures
);

router.use(resolveTenant);

router.get('/me', requireRoles('SUPER_ADMIN', 'GYM_OWNER', 'MANAGER'), TenantController.getCurrent);
router.put('/me', requireRoles('GYM_OWNER'), TenantController.update);

export default router;
