import { Router } from 'express';
import * as MediaAdController from '../controllers/MediaAdController.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { resolveTenant } from '../middlewares/tenant.middleware.js';
import { requireRoles } from '../middlewares/rbac.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  createMediaAdSchema,
  updateMediaAdSchema,
  mediaAdParamsSchema,
  listMediaAdsQuerySchema,
} from '../validators/mediaAd.validator.js';

const router = Router({ mergeParams: true });

router.use(authenticate, resolveTenant);

const managerRoles = ['SUPER_ADMIN', 'GYM_OWNER', 'MANAGER'];

router.get('/:gymId/media-ads', requireRoles(...managerRoles), validate(listMediaAdsQuerySchema), MediaAdController.list);
router.post('/:gymId/media-ads', requireRoles(...managerRoles), validate(createMediaAdSchema), MediaAdController.create);
router.get('/:gymId/media-ads/:adId', requireRoles(...managerRoles), validate(mediaAdParamsSchema), MediaAdController.getById);
router.put('/:gymId/media-ads/:adId', requireRoles(...managerRoles), validate(updateMediaAdSchema), MediaAdController.update);
router.delete('/:gymId/media-ads/:adId', requireRoles(...managerRoles), validate(mediaAdParamsSchema), MediaAdController.remove);

export default router;
