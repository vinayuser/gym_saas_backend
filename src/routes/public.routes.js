import { Router } from 'express';
import * as PublicGymController from '../controllers/PublicGymController.js';

const router = Router();

/** Resolve gym branding by slug or code — used by mobile app splash / gym picker */
router.get('/resolve', PublicGymController.resolve);

/** List gyms for a SaaS tenant (multi-location) */
router.get('/tenants/:tenantSlug/gyms', PublicGymController.tenantGyms);

/** Lightweight branding payload (logo + theme colors) */
router.get('/gyms/:slug/branding', PublicGymController.branding);

/** Public gym profile for members (hours, plans, contact) */
router.get('/gyms/:slug', PublicGymController.gymInfo);

export default router;
