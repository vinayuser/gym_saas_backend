import { z } from 'zod';

const orderItemBody = z.object({
  productId: z.string().uuid(),
  quantity: z.coerce.number().int().positive(),
});

const storeOrderStatus = z.enum([
  'PLACED',
  'CONFIRMED',
  'PREPARING',
  'READY_FOR_PICKUP',
  'COLLECTED',
  'CANCELLED',
]);

export const orderParamsSchema = z.object({
  params: z.object({ gymId: z.string().uuid(), orderId: z.string().uuid() }),
});

export const memberOrdersParamsSchema = z.object({
  params: z.object({ gymId: z.string().uuid(), memberId: z.string().uuid() }),
});

export const createOrderSchema = z.object({
  params: z.object({ gymId: z.string().uuid() }),
  body: z.object({
    memberId: z.string().uuid(),
    items: z.array(orderItemBody).min(1),
    notes: z.string().max(500).optional().nullable(),
    fulfillmentType: z.enum(['PICKUP', 'DELIVERY']).optional(),
    status: z.enum(['PENDING', 'COMPLETED']).optional(),
  }),
});

export const updateOrderStatusSchema = z.object({
  params: z.object({ gymId: z.string().uuid(), orderId: z.string().uuid() }),
  body: z.object({
    fulfillmentStatus: storeOrderStatus,
    notes: z.string().max(500).optional().nullable(),
  }),
});

export const listOrdersQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    fulfillmentStatus: storeOrderStatus.optional(),
    memberId: z.string().uuid().optional(),
  }),
  params: z.object({ gymId: z.string().uuid() }),
});
