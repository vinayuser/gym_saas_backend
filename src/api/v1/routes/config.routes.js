import { Router } from 'express';
import * as AppConfigController from '../controllers/AppConfigController.js';

const router = Router();

/**
 * Splash bootstrap — no auth.
 * GET /api/v1/app/config?alias=iron-district
 */
router.get('/config', AppConfigController.config);

export default router;
