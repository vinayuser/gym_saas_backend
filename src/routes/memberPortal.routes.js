import { Router } from 'express';
import * as MemberPortalController from '../controllers/MemberPortalController.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { requireRoles } from '../middlewares/rbac.middleware.js';

const router = Router();

router.use(authenticate);
router.get(
  '/me',
  requireRoles('MEMBER', 'GYM_OWNER', 'MANAGER', 'RECEPTIONIST', 'TRAINER'),
  MemberPortalController.me
);
router.get(
  '/me/attendance',
  requireRoles('MEMBER', 'GYM_OWNER', 'MANAGER', 'RECEPTIONIST', 'TRAINER'),
  MemberPortalController.attendance
);

export default router;
