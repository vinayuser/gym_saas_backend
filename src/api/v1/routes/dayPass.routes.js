import { Router } from 'express';
import { validate } from '../../../middlewares/validate.middleware.js';
import { memberAuth } from '../middleware/memberAuth.js';
import * as AppDayPassController from '../controllers/AppDayPassController.js';
import { dayPassCheckoutSchema, dayPassVerifySchema } from '../validators/app.validator.js';

const router = Router();
router.use(...memberAuth);

router.get('/partner-gyms', AppDayPassController.partnerGyms);
router.get('/partner-gyms/:gymId', AppDayPassController.partnerGymDetail);
router.get('/partner-gyms/:gymId/availability', AppDayPassController.availability);
router.post('/day-passes/checkout', validate(dayPassCheckoutSchema), AppDayPassController.checkout);
router.post(
  '/day-passes/verify-payment',
  validate(dayPassVerifySchema),
  AppDayPassController.verifyPayment
);
router.get('/day-passes', AppDayPassController.list);
router.get('/day-passes/:passId', AppDayPassController.detail);

export default router;
