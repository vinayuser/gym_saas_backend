import { Router } from 'express';
import * as InviteController from '../controllers/InviteController.js';
import * as AppPublishController from '../controllers/AppPublishController.js';
import { validate } from '../middlewares/validate.middleware.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { requirePlatform } from '../middlewares/rbac.middleware.js';
import {
  createInviteSchema,
  inviteIdParamSchema,
  inviteTokenParamSchema,
  checkoutSchema,
  verifyPaymentSchema,
  listInvitesQuerySchema,
  inviteRecordsQuerySchema,
  publishAppSchema,
  appAdsSchema,
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

router.use(authenticate);

router.get('/', requirePlatform('businesses.view', 'dashboard.view'), validate(listInvitesQuerySchema), InviteController.list);
router.get('/:id/overview', requirePlatform('businesses.view'), validate(inviteIdParamSchema), InviteController.getOverview);
router.get('/:id/records', requirePlatform('businesses.view'), validate(inviteRecordsQuerySchema), InviteController.listRecords);
router.post('/', requirePlatform('businesses.manage'), validate(createInviteSchema), InviteController.create);
router.patch('/:id/sent', requirePlatform('businesses.manage'), validate(inviteIdParamSchema), InviteController.markSent);
router.patch('/:id/revoke', requirePlatform('businesses.manage'), validate(inviteIdParamSchema), InviteController.revoke);
router.get('/:id/publish', requirePlatform('businesses.view'), validate(inviteIdParamSchema), AppPublishController.getPublish);
router.put('/:id/publish', requirePlatform('businesses.manage'), validate(publishAppSchema), AppPublishController.updatePublish);
router.put('/:id/app-ads', requirePlatform('businesses.manage'), validate(appAdsSchema), AppPublishController.updateAppAds);

export default router;
