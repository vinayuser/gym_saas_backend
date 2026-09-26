import { Router } from 'express';
import * as SupportController from '../controllers/SupportController.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { requireRoles, requirePlatform } from '../middlewares/rbac.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  createSupportTicketSchema,
  listSupportTicketsSchema,
  updateSupportTicketStatusSchema,
} from '../validators/support.validator.js';

const router = Router();

router.use(authenticate);

router.post(
  '/tickets',
  requireRoles('SUPER_ADMIN', 'GYM_OWNER', 'MANAGER', 'RECEPTIONIST', 'TRAINER'),
  validate(createSupportTicketSchema),
  SupportController.create
);

const canListTickets = (req, res, next) => {
  if (req.user?.role === 'PLATFORM_ADMIN') {
    return requirePlatform('support.view')(req, res, next);
  }
  return requireRoles('SUPER_ADMIN', 'GYM_OWNER', 'MANAGER', 'RECEPTIONIST', 'TRAINER')(req, res, next);
};

router.get('/tickets', canListTickets, validate(listSupportTicketsSchema), SupportController.list);

router.patch(
  '/tickets/:ticketId/status',
  requirePlatform('support.manage'),
  validate(updateSupportTicketStatusSchema),
  SupportController.updateStatus
);

export default router;
