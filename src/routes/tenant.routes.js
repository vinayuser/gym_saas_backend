import { Router } from 'express';
import * as TenantController from '../controllers/TenantController.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { resolveTenant } from '../middlewares/tenant.middleware.js';
import { requireRoles } from '../middlewares/rbac.middleware.js';

const router = Router();

router.use(authenticate, resolveTenant);

router.get('/me', requireRoles('SUPER_ADMIN', 'GYM_OWNER', 'MANAGER'), TenantController.getCurrent);
router.put('/me', requireRoles('GYM_OWNER'), TenantController.update);

export default router;
