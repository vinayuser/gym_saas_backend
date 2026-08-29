import * as OrderModel from '../models/OrderModel.js';
import * as GymModel from '../models/GymModel.js';
import * as MemberModel from '../models/MemberModel.js';
import { NotFoundError, BadRequestError } from '../utils/errors.js';
import { parsePagination, buildPaginationMeta } from '../utils/response.js';

const validateGym = async (tenantId, gymId) => {
  const gym = await GymModel.findById(gymId, tenantId);
  if (!gym) throw new NotFoundError('Gym not found');
  return gym;
};

const mapOrder = (order) => ({
  ...order,
  totalAmount: Number(order.totalAmount),
  taxAmount: order.taxAmount != null ? Number(order.taxAmount) : null,
  itemCount: order.items?.reduce((s, i) => s + i.quantity, 0) ?? 0,
  items: order.items?.map((item) => ({
    ...item,
    unitPrice: Number(item.unitPrice),
    total: Number(item.total),
    product: item.product
      ? { ...item.product, price: Number(item.product.price) }
      : item.product,
  })),
});

export const list = async (tenantId, gymId, query) => {
  await validateGym(tenantId, gymId);
  const pagination = parsePagination(query);
  const [rows, total] = await OrderModel.findMany(gymId, {
    ...pagination,
    fulfillmentStatus: query.fulfillmentStatus,
    memberId: query.memberId,
  });
  return {
    orders: rows.map(mapOrder),
    pagination: buildPaginationMeta(total, pagination.page, pagination.limit),
  };
};

export const stats = async (tenantId, gymId) => {
  await validateGym(tenantId, gymId);
  const [agg, byStatus] = await Promise.all([
    OrderModel.stats(gymId),
    OrderModel.fulfillmentStats(gymId),
  ]);
  return {
    totalOrders: agg._count,
    totalRevenue: Number(agg._sum.totalAmount || 0),
    totalTax: Number(agg._sum.taxAmount || 0),
    byStatus,
  };
};

export const getById = async (tenantId, gymId, orderId) => {
  await validateGym(tenantId, gymId);
  const order = await OrderModel.findById(orderId, gymId);
  if (!order) throw new NotFoundError('Order not found');
  return mapOrder(order);
};

export const create = async (tenantId, gymId, body) => {
  await validateGym(tenantId, gymId);
  const member = await MemberModel.findById(body.memberId, gymId);
  if (!member) throw new NotFoundError('Member not found');

  try {
    const order = await OrderModel.create({
      gymId,
      memberId: body.memberId,
      items: body.items,
      notes: body.notes,
      fulfillmentType: body.fulfillmentType,
      status: body.status,
    });
    return mapOrder(order);
  } catch (err) {
    if (err.message === 'INSUFFICIENT_STOCK') {
      throw new BadRequestError('Insufficient stock for one or more products');
    }
    if (err.message === 'PRODUCT_NOT_FOUND') {
      throw new BadRequestError('One or more products were not found');
    }
    throw err;
  }
};

const STATUS_TRANSITIONS = {
  PLACED: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PREPARING', 'READY_FOR_PICKUP', 'CANCELLED'],
  PREPARING: ['READY_FOR_PICKUP', 'CANCELLED'],
  READY_FOR_PICKUP: ['COLLECTED', 'CANCELLED'],
  COLLECTED: [],
  CANCELLED: [],
};

export const updateStatus = async (tenantId, gymId, orderId, body) => {
  await validateGym(tenantId, gymId);
  const existing = await OrderModel.findById(orderId, gymId);
  if (!existing) throw new NotFoundError('Order not found');

  const allowed = STATUS_TRANSITIONS[existing.fulfillmentStatus] || [];
  if (!allowed.includes(body.fulfillmentStatus)) {
    throw new BadRequestError(
      `Cannot change status from ${existing.fulfillmentStatus} to ${body.fulfillmentStatus}`
    );
  }

  const order = await OrderModel.updateFulfillment(orderId, body);
  return mapOrder(order);
};

export const listForMember = async (tenantId, gymId, memberId, query) => {
  await validateGym(tenantId, gymId);
  const member = await MemberModel.findById(memberId, gymId);
  if (!member) throw new NotFoundError('Member not found');

  const pagination = parsePagination(query);
  const [rows, total] = await OrderModel.findByMember(gymId, memberId, pagination);
  return {
    orders: rows.map(mapOrder),
    pagination: buildPaginationMeta(total, pagination.page, pagination.limit),
  };
};
