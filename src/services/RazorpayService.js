import crypto from 'crypto';
import Razorpay from 'razorpay';
import env from '../config/env.js';
import { BadRequestError } from '../utils/errors.js';

let client = null;

const getClient = () => {
  if (!env.razorpay.keyId || !env.razorpay.keySecret) {
    return null;
  }
  if (!client) {
    client = new Razorpay({
      key_id: env.razorpay.keyId,
      key_secret: env.razorpay.keySecret,
    });
  }
  return client;
};

export const isConfigured = () => Boolean(env.razorpay.keyId && env.razorpay.keySecret);

export const getPublicKey = () => env.razorpay.keyId;

export const createOrder = async ({ amountInr, receipt, notes = {} }) => {
  const razorpay = getClient();
  if (!razorpay) {
    if (!env.razorpay.allowMock) {
      throw new BadRequestError('Razorpay is not configured');
    }
    return {
      id: `order_mock_${Date.now()}`,
      amount: Math.round(amountInr * 100),
      currency: 'INR',
      mock: true,
    };
  }

  const amountPaise = Math.round(Number(amountInr) * 100);
  const order = await razorpay.orders.create({
    amount: amountPaise,
    currency: 'INR',
    receipt,
    notes,
  });

  return order;
};

export const verifyPaymentSignature = ({ orderId, paymentId, signature }) => {
  if (!isConfigured()) {
    if (env.razorpay.allowMock && String(orderId).startsWith('order_mock_')) {
      return true;
    }
    throw new BadRequestError('Razorpay is not configured');
  }

  const body = `${orderId}|${paymentId}`;
  const expected = crypto
    .createHmac('sha256', env.razorpay.keySecret)
    .update(body)
    .digest('hex');

  if (expected !== signature) {
    throw new BadRequestError('Invalid payment signature');
  }
  return true;
};

/** Find a captured payment for an order (used when the checkout callback is missed). */
export const fetchCapturedPaymentForOrder = async (orderId) => {
  const razorpay = getClient();
  if (!razorpay) return null;

  const result = await razorpay.orders.fetchPayments(orderId);
  const items = result?.items || [];
  return items.find((p) => p.status === 'captured') || null;
};

/** Confirm payment belongs to order and is captured (API fallback when signature is unavailable). */
export const verifyPaymentOnOrder = async ({ orderId, paymentId }) => {
  const razorpay = getClient();
  if (!razorpay) {
    throw new BadRequestError('Razorpay is not configured');
  }

  const payment = await razorpay.payments.fetch(paymentId);
  if (payment.order_id !== orderId) {
    throw new BadRequestError('Payment does not match order');
  }
  if (payment.status !== 'captured') {
    throw new BadRequestError('Payment is not completed');
  }
  return true;
};
