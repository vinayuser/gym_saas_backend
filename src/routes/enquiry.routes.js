import { Router } from 'express';
import * as EnquiryController from '../controllers/EnquiryController.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { resolveTenant } from '../middlewares/tenant.middleware.js';
import { requireRoles } from '../middlewares/rbac.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  createEnquirySchema,
  updateEnquirySchema,
  enquiryParamsSchema,
} from '../validators/enquiry.validator.js';
import { gymIdParamSchema } from '../validators/gym.validator.js';

const router = Router({ mergeParams: true });
router.use(authenticate, resolveTenant);
const roles = ['SUPER_ADMIN', 'GYM_OWNER', 'MANAGER', 'RECEPTIONIST'];

router.get('/:gymId/enquiries', requireRoles(...roles), validate(gymIdParamSchema), EnquiryController.list);
router.post('/:gymId/enquiries', requireRoles(...roles), validate(createEnquirySchema), EnquiryController.create);
router.get('/:gymId/enquiries/:enquiryId', requireRoles(...roles), validate(enquiryParamsSchema), EnquiryController.getById);
router.put('/:gymId/enquiries/:enquiryId', requireRoles(...roles), validate(updateEnquirySchema), EnquiryController.update);
router.delete('/:gymId/enquiries/:enquiryId', requireRoles(...roles), validate(enquiryParamsSchema), EnquiryController.remove);

export default router;
