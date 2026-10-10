import { Router } from 'express';
import * as SupportController from '../controllers/SupportController.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { requireRoles, requirePlatform } from '../middlewares/rbac.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  createSupportTicketSchema,
  listSupportTicketsSchema,
  replySupportTicketSchema,
  supportTicketIdSchema,
  updateSupportTicketStatusSchema,
} from '../validators/support.validator.js';

const router = Router();

router.use(authenticate);

const canUseTickets = (req, res, next) => {
  if (req.user?.role === 'PLATFORM_ADMIN') {
    return requirePlatform('support.view')(req, res, next);
  }
  return requireRoles('SUPER_ADMIN', 'GYM_OWNER', 'MANAGER', 'RECEPTIONIST', 'TRAINER')(req, res, next);
};

const canManageTickets = (req, res, next) => {
  if (req.user?.role === 'SUPER_ADMIN') return next();
  return requirePlatform('support.manage')(req, res, next);
};

router.post(
  '/tickets',
  requireRoles('GYM_OWNER', 'MANAGER', 'RECEPTIONIST', 'TRAINER'),
  validate(createSupportTicketSchema),
  SupportController.create
);

router.get('/tickets', canUseTickets, validate(listSupportTicketsSchema), SupportController.list);
router.get('/tickets/:ticketId', canUseTickets, validate(supportTicketIdSchema), SupportController.getById);
router.post('/tickets/:ticketId/replies', canUseTickets, validate(replySupportTicketSchema), SupportController.reply);
router.patch(
  '/tickets/:ticketId/status',
  canManageTickets,
  validate(updateSupportTicketStatusSchema),
  SupportController.updateStatus
);

export default router;
