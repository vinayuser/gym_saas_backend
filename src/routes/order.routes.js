import { Router } from 'express';
import * as OrderController from '../controllers/OrderController.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { resolveTenant } from '../middlewares/tenant.middleware.js';
import { requireRoles } from '../middlewares/rbac.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  orderParamsSchema,
  createOrderSchema,
  updateOrderStatusSchema,
  listOrdersQuerySchema,
  memberOrdersParamsSchema,
} from '../validators/order.validator.js';
import { gymIdParamSchema } from '../validators/gym.validator.js';

const router = Router({ mergeParams: true });
router.use(authenticate, resolveTenant);
const roles = ['SUPER_ADMIN', 'GYM_OWNER', 'MANAGER', 'RECEPTIONIST'];

router.get('/:gymId/orders/stats', requireRoles(...roles), validate(gymIdParamSchema), OrderController.stats);
router.get('/:gymId/orders', requireRoles(...roles), validate(listOrdersQuerySchema), OrderController.list);
router.post('/:gymId/orders', requireRoles(...roles), validate(createOrderSchema), OrderController.create);
router.get('/:gymId/orders/:orderId', requireRoles(...roles), validate(orderParamsSchema), OrderController.getById);
router.patch(
  '/:gymId/orders/:orderId/status',
  requireRoles(...roles),
  validate(updateOrderStatusSchema),
  OrderController.updateStatus
);
router.get(
  '/:gymId/members/:memberId/orders',
  requireRoles(...roles, 'TRAINER', 'MEMBER'),
  validate(memberOrdersParamsSchema),
  OrderController.listForMember
);

export default router;
