import { Router } from 'express';
import * as EventController from '../controllers/EventController.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { resolveTenant } from '../middlewares/tenant.middleware.js';
import { requireRoles } from '../middlewares/rbac.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { createEventSchema, updateEventSchema, eventParamsSchema } from '../validators/event.validator.js';
import { gymIdParamSchema } from '../validators/gym.validator.js';

const router = Router({ mergeParams: true });
router.use(authenticate, resolveTenant);
const roles = ['SUPER_ADMIN', 'GYM_OWNER', 'MANAGER', 'RECEPTIONIST'];

router.get('/:gymId/events', requireRoles(...roles), validate(gymIdParamSchema), EventController.list);
router.post('/:gymId/events', requireRoles(...roles), validate(createEventSchema), EventController.create);
router.get('/:gymId/events/:eventId', requireRoles(...roles), validate(eventParamsSchema), EventController.getById);
router.put('/:gymId/events/:eventId', requireRoles(...roles), validate(updateEventSchema), EventController.update);
router.delete('/:gymId/events/:eventId', requireRoles('SUPER_ADMIN', 'GYM_OWNER', 'MANAGER'), validate(eventParamsSchema), EventController.remove);

export default router;
