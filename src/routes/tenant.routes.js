import { Router } from 'express';
import * as TenantController from '../controllers/TenantController.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { resolveTenant } from '../middlewares/tenant.middleware.js';
import { requireRoles, requirePlatform } from '../middlewares/rbac.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  listTenantsQuerySchema,
  updateTenantStatusSchema,
  updateTenantFeaturesSchema,
  updateGymAddonsSchema,
} from '../validators/tenant.validator.js';

const router = Router();

router.use(authenticate);

/** Super admin — platform tenant directory */
router.get(
  '/',
  requirePlatform('businesses.view', 'dashboard.view'),
  validate(listTenantsQuerySchema),
  TenantController.list
);
router.patch(
  '/:id/status',
  requirePlatform('businesses.manage'),
  validate(updateTenantStatusSchema),
  TenantController.updateStatus
);
router.patch(
  '/:id/features',
  requirePlatform('businesses.manage'),
  validate(updateTenantFeaturesSchema),
  TenantController.updateFeatures
);
router.patch(
  '/:id/gyms/:gymId/addons',
  requirePlatform('businesses.manage'),
  validate(updateGymAddonsSchema),
  TenantController.updateGymAddons
);

router.use(resolveTenant);

router.get('/me', requireRoles('SUPER_ADMIN', 'GYM_OWNER', 'MANAGER'), TenantController.getCurrent);
router.put('/me', requireRoles('GYM_OWNER'), TenantController.update);

export default router;
