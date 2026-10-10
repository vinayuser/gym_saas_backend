import { Router } from 'express';
import { memberAuth } from '../middleware/memberAuth.js';
import * as AppTrainerController from '../controllers/AppTrainerController.js';

const router = Router();
router.use(...memberAuth);

router.get('/', AppTrainerController.list);
router.get('/:trainerId', AppTrainerController.detail);

export default router;
