import { Router } from 'express';
import { validate } from '../../../middlewares/validate.middleware.js';
import { memberAuth } from '../middleware/memberAuth.js';
import * as AppChatController from '../controllers/AppChatController.js';
import { chatSendSchema } from '../validators/app.validator.js';

const router = Router();
router.use(...memberAuth);

router.get('/', AppChatController.list);
router.post('/', validate(chatSendSchema), AppChatController.send);

export default router;
