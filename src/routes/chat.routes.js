import { Router } from 'express';
import * as ChatController from '../controllers/ChatController.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { resolveTenant } from '../middlewares/tenant.middleware.js';
import { requireRoles } from '../middlewares/rbac.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  listChatQuerySchema,
  createChatMessageSchema,
  updateChatMessageSchema,
  chatMessageParamsSchema,
  pinChatMessageSchema,
} from '../validators/chat.validator.js';

const router = Router({ mergeParams: true });
router.use(authenticate, resolveTenant);

const chatRoles = ['SUPER_ADMIN', 'GYM_OWNER', 'MANAGER', 'RECEPTIONIST', 'TRAINER'];

router.get('/:gymId/chat/messages', requireRoles(...chatRoles), validate(listChatQuerySchema), ChatController.list);
router.post('/:gymId/chat/messages', requireRoles(...chatRoles), validate(createChatMessageSchema), ChatController.create);
router.patch(
  '/:gymId/chat/messages/:messageId',
  requireRoles(...chatRoles),
  validate(updateChatMessageSchema),
  ChatController.update
);
router.delete(
  '/:gymId/chat/messages/:messageId',
  requireRoles(...chatRoles),
  validate(chatMessageParamsSchema),
  ChatController.remove
);
router.patch(
  '/:gymId/chat/messages/:messageId/pin',
  requireRoles('SUPER_ADMIN', 'GYM_OWNER'),
  validate(pinChatMessageSchema),
  ChatController.pin
);

export default router;
