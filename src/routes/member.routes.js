import { Router } from 'express';
import * as MemberController from '../controllers/MemberController.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { resolveTenant } from '../middlewares/tenant.middleware.js';
import { requireRoles } from '../middlewares/rbac.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  createMemberSchema,
  updateMemberSchema,
  memberParamsSchema,
  gymIdParamSchema,
} from '../validators/member.validator.js';

const router = Router({ mergeParams: true });

router.use(authenticate, resolveTenant);

const staffRoles = ['SUPER_ADMIN', 'GYM_OWNER', 'MANAGER', 'RECEPTIONIST'];

router.get('/:gymId/members', requireRoles(...staffRoles, 'TRAINER'), validate(gymIdParamSchema), MemberController.list);
router.post('/:gymId/members', requireRoles(...staffRoles), validate(createMemberSchema), MemberController.create);
router.get('/:gymId/members/:memberId', requireRoles(...staffRoles, 'TRAINER'), validate(memberParamsSchema), MemberController.getById);
router.put('/:gymId/members/:memberId', requireRoles(...staffRoles), validate(updateMemberSchema), MemberController.update);
router.delete('/:gymId/members/:memberId', requireRoles('SUPER_ADMIN', 'GYM_OWNER', 'MANAGER'), validate(memberParamsSchema), MemberController.remove);

export default router;
