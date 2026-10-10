import { Router } from 'express';
import { memberAuth } from '../middleware/memberAuth.js';
import * as AppEventController from '../controllers/AppEventController.js';

const router = Router();
router.use(...memberAuth);

router.get('/', AppEventController.list);
router.get('/:eventId', AppEventController.detail);
router.post('/:eventId/book', AppEventController.book);
router.delete('/:eventId/book', AppEventController.cancel);

export default router;
