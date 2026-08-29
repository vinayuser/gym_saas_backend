import { Router } from 'express';
import * as BannerController from '../controllers/BannerController.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { resolveTenant } from '../middlewares/tenant.middleware.js';
import { requireRoles } from '../middlewares/rbac.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  createBannerSchema,
  updateBannerSchema,
  bannerParamsSchema,
} from '../validators/banner.validator.js';
import { gymIdParamSchema } from '../validators/gym.validator.js';

const router = Router({ mergeParams: true });

router.use(authenticate, resolveTenant);

const managerRoles = ['SUPER_ADMIN', 'GYM_OWNER', 'MANAGER'];

router.get(
  '/:gymId/banners/stats',
  requireRoles(...managerRoles),
  validate(gymIdParamSchema),
  BannerController.stats
);
router.get(
  '/:gymId/banners',
  requireRoles(...managerRoles),
  validate(gymIdParamSchema),
  BannerController.list
);
router.post(
  '/:gymId/banners',
  requireRoles(...managerRoles),
  validate(createBannerSchema),
  BannerController.create
);
router.get(
  '/:gymId/banners/:bannerId',
  requireRoles(...managerRoles),
  validate(bannerParamsSchema),
  BannerController.getById
);
router.put(
  '/:gymId/banners/:bannerId',
  requireRoles(...managerRoles),
  validate(updateBannerSchema),
  BannerController.update
);
router.delete(
  '/:gymId/banners/:bannerId',
  requireRoles('SUPER_ADMIN', 'GYM_OWNER', 'MANAGER'),
  validate(bannerParamsSchema),
  BannerController.remove
);
router.post(
  '/:gymId/banners/:bannerId/duplicate',
  requireRoles(...managerRoles),
  validate(bannerParamsSchema),
  BannerController.duplicate
);

export default router;
