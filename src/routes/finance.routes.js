import { Router } from 'express';
import * as FinanceController from '../controllers/FinanceController.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { resolveTenant } from '../middlewares/tenant.middleware.js';
import { requireRoles } from '../middlewares/rbac.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { financeQuerySchema, financeOverviewQuerySchema } from '../validators/finance.validator.js';

const router = Router({ mergeParams: true });
router.use(authenticate, resolveTenant);
const roles = ['SUPER_ADMIN', 'GYM_OWNER', 'MANAGER'];

router.get('/:gymId/finance/overview', requireRoles(...roles), validate(financeOverviewQuerySchema), FinanceController.overview);
router.get('/:gymId/finance/ledger', requireRoles(...roles), validate(financeQuerySchema), FinanceController.ledger);
router.get('/:gymId/finance/payments', requireRoles(...roles), validate(financeQuerySchema), FinanceController.payments);
router.get('/:gymId/finance/expenses', requireRoles(...roles), validate(financeOverviewQuerySchema), FinanceController.expenses);
router.get('/:gymId/finance/reports', requireRoles(...roles), validate(financeOverviewQuerySchema), FinanceController.reports);

export default router;
