import { Router } from 'express';
import * as TransactionController from '../controllers/TransactionController.js';
import { validate } from '../middlewares/validate.middleware.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { requireRoles } from '../middlewares/rbac.middleware.js';
import {
  listTransactionsQuerySchema,
  transactionIdParamSchema,
} from '../validators/transaction.validator.js';

const router = Router();

router.use(authenticate, requireRoles('SUPER_ADMIN'));

router.get('/', validate(listTransactionsQuerySchema), TransactionController.list);
router.get('/:id', validate(transactionIdParamSchema), TransactionController.getById);

export default router;
