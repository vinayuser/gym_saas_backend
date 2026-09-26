import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import { resolveTenant } from '../middlewares/tenant.middleware.js';
import { requireRoles, requirePlatform } from '../middlewares/rbac.middleware.js';
import * as PlatformBillingController from '../controllers/PlatformBillingController.js';

const router = Router();

router.get('/public', PlatformBillingController.getPublic);

router.get(
  '/mine',
  authenticate,
  resolveTenant,
  requireRoles('SUPER_ADMIN', 'GYM_OWNER', 'MANAGER'),
  PlatformBillingController.getMine
);

router.get('/', authenticate, requirePlatform('plans.view'), PlatformBillingController.getPublic);
router.put('/', authenticate, requirePlatform('plans.manage'), PlatformBillingController.updateCatalog);
router.patch('/addons/:key', authenticate, requirePlatform('plans.manage'), PlatformBillingController.updateAddon);

export default router;
