import * as AppStoreService from '../services/AppStoreService.js';
import { successResponse } from '../../../utils/response.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';

export const products = asyncHandler(async (req, res) => {
  const data = await AppStoreService.listProducts(req.member, req.query);
  successResponse(res, data);
});

export const productDetail = asyncHandler(async (req, res) => {
  const data = await AppStoreService.getProduct(req.member, req.params.productId);
  successResponse(res, data);
});

export const getCart = asyncHandler(async (req, res) => {
  const data = await AppStoreService.getCart(req.member, req.memberGym);
  successResponse(res, data);
});

export const addToCart = asyncHandler(async (req, res) => {
  const data = await AppStoreService.addToCart(req.member, req.memberGym, req.body);
  successResponse(res, data, 'Added to cart', 201);
});

export const updateCartItem = asyncHandler(async (req, res) => {
  const data = await AppStoreService.updateCartItem(
    req.member,
    req.memberGym,
    req.params.productId,
    req.body
  );
  successResponse(res, data, 'Cart updated');
});

export const clearCart = asyncHandler(async (req, res) => {
  const data = await AppStoreService.clearCart(req.member, req.memberGym);
  successResponse(res, data, 'Cart cleared');
});

export const placeOrder = asyncHandler(async (req, res) => {
  const data = await AppStoreService.placeOrder(req.member, req.memberGym, req.body);
  successResponse(res, data, 'Order placed', 201);
});

export const orders = asyncHandler(async (req, res) => {
  const data = await AppStoreService.listOrders(req.member, req.memberGym);
  successResponse(res, data);
});

export const orderDetail = asyncHandler(async (req, res) => {
  const data = await AppStoreService.getOrder(req.member, req.memberGym, req.params.orderId);
  successResponse(res, data);
});
