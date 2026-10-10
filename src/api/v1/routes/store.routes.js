import { Router } from 'express';
import { validate } from '../../../middlewares/validate.middleware.js';
import { memberAuth } from '../middleware/memberAuth.js';
import * as AppStoreController from '../controllers/AppStoreController.js';
import { cartAddSchema, cartUpdateSchema, placeOrderSchema } from '../validators/app.validator.js';

const router = Router();
router.use(...memberAuth);

router.get('/products', AppStoreController.products);
router.get('/products/:productId', AppStoreController.productDetail);
router.get('/cart', AppStoreController.getCart);
router.post('/cart', validate(cartAddSchema), AppStoreController.addToCart);
router.patch('/cart/items/:productId', validate(cartUpdateSchema), AppStoreController.updateCartItem);
router.delete('/cart', AppStoreController.clearCart);
router.post('/orders', validate(placeOrderSchema), AppStoreController.placeOrder);
router.get('/orders', AppStoreController.orders);
router.get('/orders/:orderId', AppStoreController.orderDetail);

export default router;
