import { Router } from 'express';
import * as SupportController from '../controllers/SupportController.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { requireRoles } from '../middlewares/rbac.middleware.js';
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

router.get(
  '/tickets',
  requireRoles('SUPER_ADMIN', 'GYM_OWNER', 'MANAGER', 'RECEPTIONIST', 'TRAINER'),
  validate(listSupportTicketsSchema),
  SupportController.list
);

router.patch(
  '/tickets/:ticketId/status',
  requireRoles('SUPER_ADMIN'),
  validate(updateSupportTicketStatusSchema),
  SupportController.updateStatus
);

export default router;
