import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import * as NotificationController from '../controllers/NotificationController.js';

const router = Router();

router.get('/', authenticate, NotificationController.list);

export default router;
