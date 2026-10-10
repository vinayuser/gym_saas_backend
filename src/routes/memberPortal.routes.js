import { Router } from 'express';
import * as MemberPortalController from '../controllers/MemberPortalController.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { requireRoles } from '../middlewares/rbac.middleware.js';

const router = Router();
const memberRoles = ['MEMBER'];

router.use(authenticate);
router.get('/me', requireRoles(...memberRoles), MemberPortalController.me);
router.patch('/me', requireRoles(...memberRoles), MemberPortalController.updateMe);
router.get('/home', requireRoles(...memberRoles), MemberPortalController.home);
router.get('/me/attendance', requireRoles(...memberRoles), MemberPortalController.attendance);
router.post('/me/check-in', requireRoles(...memberRoles), MemberPortalController.checkIn);
router.get('/banners', requireRoles(...memberRoles), MemberPortalController.banners);
router.get('/events', requireRoles(...memberRoles), MemberPortalController.events);
router.post('/events/:eventId/book', requireRoles(...memberRoles), MemberPortalController.bookEvent);
router.delete('/events/:eventId/book', requireRoles(...memberRoles), MemberPortalController.cancelEvent);
router.get('/bookings', requireRoles(...memberRoles), MemberPortalController.bookings);
router.get('/products', requireRoles(...memberRoles), MemberPortalController.products);
router.post('/orders', requireRoles(...memberRoles), MemberPortalController.placeOrder);
router.get('/orders', requireRoles(...memberRoles), MemberPortalController.orders);
router.get('/plans', requireRoles(...memberRoles), MemberPortalController.plans);
router.post('/measurements', requireRoles(...memberRoles), MemberPortalController.addMeasurement);
router.get('/chat', requireRoles(...memberRoles), MemberPortalController.chat);
router.post('/chat', requireRoles(...memberRoles), MemberPortalController.sendChat);

export default router;
