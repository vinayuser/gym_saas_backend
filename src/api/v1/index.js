import { Router } from 'express';
import configRoutes from './routes/config.routes.js';
import authRoutes from './routes/auth.routes.js';
import memberRoutes from './routes/member.routes.js';
import eventsRoutes from './routes/events.routes.js';
import storeRoutes from './routes/store.routes.js';
import dayPassRoutes from './routes/dayPass.routes.js';
import trainersRoutes from './routes/trainers.routes.js';
import chatRoutes from './routes/chat.routes.js';
import notificationsRoutes from './routes/notifications.routes.js';

/**
 * Member mobile app API (Stitch FitZone screens).
 * Mounted at /api/v1/app
 */
const router = Router();

/** Splash: theme, logo, ads, feature flags — no auth */
router.use(configRoutes);
router.use('/auth', authRoutes);
router.use(memberRoutes);
router.use('/events', eventsRoutes);
router.use('/store', storeRoutes);
router.use(dayPassRoutes);
router.use('/trainers', trainersRoutes);
router.use('/chat', chatRoutes);
router.use('/notifications', notificationsRoutes);

export default router;
