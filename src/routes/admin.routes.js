import { Router } from 'express';
import * as AdminDashboardController from '../controllers/AdminDashboardController.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { requirePlatform } from '../middlewares/rbac.middleware.js';

const router = Router();

router.use(authenticate, requirePlatform('dashboard.view'));

router.get('/dashboard', AdminDashboardController.dashboard);

export default router;
