import { Router } from 'express';
import * as TransactionController from '../controllers/TransactionController.js';
import { validate } from '../middlewares/validate.middleware.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { requirePlatform } from '../middlewares/rbac.middleware.js';
import {
  listTransactionsQuerySchema,
  transactionIdParamSchema,
} from '../validators/transaction.validator.js';

const router = Router();

router.use(authenticate, requirePlatform('transactions.view'));

router.get('/', validate(listTransactionsQuerySchema), TransactionController.list);
router.get('/:id', validate(transactionIdParamSchema), TransactionController.getById);

export default router;
