import { Router } from 'express';
import * as InviteController from '../controllers/InviteController.js';
import { validate } from '../middlewares/validate.middleware.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { requireRoles } from '../middlewares/rbac.middleware.js';
import {
  createInviteSchema,
  inviteIdParamSchema,
  inviteTokenParamSchema,
  checkoutSchema,
  verifyPaymentSchema,
  listInvitesQuerySchema,
} from '../validators/invite.validator.js';

const router = Router();

router.get('/plans', InviteController.listPlans);

router.get('/public/:token', validate(inviteTokenParamSchema), InviteController.getByToken);
router.post(
  '/public/:token/checkout',
  validate(checkoutSchema),
  InviteController.checkout
);
router.post(
  '/public/:token/verify-payment',
  validate(verifyPaymentSchema),
  InviteController.verifyPayment
);

router.use(authenticate, requireRoles('SUPER_ADMIN'));

router.get('/', validate(listInvitesQuerySchema), InviteController.list);
router.post('/', validate(createInviteSchema), InviteController.create);
router.patch('/:id/sent', validate(inviteIdParamSchema), InviteController.markSent);
router.patch('/:id/revoke', validate(inviteIdParamSchema), InviteController.revoke);

export default router;
