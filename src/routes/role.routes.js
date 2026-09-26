import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import { requirePlatform } from '../middlewares/rbac.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import * as RoleController from '../controllers/RoleController.js';
import {
  createPlatformAdminSchema,
  createPlatformRoleSchema,
  platformRoleIdSchema,
  updatePlatformAdminSchema,
  updatePlatformRoleSchema,
} from '../validators/platformAdmin.validator.js';

const router = Router();

router.use(authenticate, requirePlatform('team.manage'));

router.get('/platform', RoleController.listTeam);
router.post('/platform', validate(createPlatformRoleSchema), RoleController.createRole);
router.put('/platform/:roleId', validate(updatePlatformRoleSchema), RoleController.updateRole);
router.delete('/platform/:roleId', validate(platformRoleIdSchema), RoleController.deleteRole);
router.post('/platform/admins', validate(createPlatformAdminSchema), RoleController.createAdmin);
router.patch('/platform/admins/:userId', validate(updatePlatformAdminSchema), RoleController.updateAdmin);

export default router;
