import { Router } from 'express';
import authRoutes from './auth.routes.js';
import tenantRoutes from './tenant.routes.js';
import gymRoutes from './gym.routes.js';
import memberRoutes from './member.routes.js';
import staffRoutes from './staff.routes.js';
import bannerRoutes from './banner.routes.js';
import membershipPlanRoutes from './membershipPlan.routes.js';
import eventRoutes from './event.routes.js';
import enquiryRoutes from './enquiry.routes.js';
import attendanceRoutes from './attendance.routes.js';
import productRoutes from './product.routes.js';
import categoryRoutes from './category.routes.js';
import orderRoutes from './order.routes.js';
import financeRoutes from './finance.routes.js';
import trainerRoutes from './trainer.routes.js';
import chatRoutes from './chat.routes.js';
import inviteRoutes from './invite.routes.js';
import gymOwnerRoutes from './gymOwner.routes.js';
import transactionRoutes from './transaction.routes.js';
import uploadRoutes from './upload.routes.js';
import supportRoutes from './support.routes.js';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ success: true, message: 'Gym SaaS API is running', timestamp: new Date().toISOString() });
});

router.use('/auth', authRoutes);
router.use('/tenants', tenantRoutes);
router.use('/gyms', gymRoutes);
router.use('/gyms', memberRoutes);
router.use('/gyms', staffRoutes);
router.use('/gyms', bannerRoutes);
router.use('/gyms', membershipPlanRoutes);
router.use('/gyms', eventRoutes);
router.use('/gyms', enquiryRoutes);
router.use('/gyms', attendanceRoutes);
router.use('/gyms', productRoutes);
router.use('/gyms', categoryRoutes);
router.use('/gyms', orderRoutes);
router.use('/gyms', financeRoutes);
router.use('/gyms', trainerRoutes);
router.use('/gyms', chatRoutes);
router.use('/invites', inviteRoutes);
router.use('/gym-owners', gymOwnerRoutes);
router.use('/transactions', transactionRoutes);
router.use('/media', uploadRoutes);
router.use('/support', supportRoutes);

export default router;
