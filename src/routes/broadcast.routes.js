import { Router } from 'express';
import * as BroadcastController from '../controllers/BroadcastController.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { requirePlatform } from '../middlewares/rbac.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { createBroadcastSchema } from '../validators/broadcast.validator.js';

const router = Router();

router.use(authenticate);

router.get('/active', BroadcastController.getActive);
router.post('/', requirePlatform('settings.view', 'dashboard.view'), validate(createBroadcastSchema), BroadcastController.create);
router.delete('/active', requirePlatform('settings.view', 'dashboard.view'), BroadcastController.removeActive);

export default router;
