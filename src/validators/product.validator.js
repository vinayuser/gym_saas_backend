import { z } from 'zod';

const productBody = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  categoryId: z.string().uuid().optional().nullable(),
  sku: z.string().max(50).optional().nullable(),
  price: z.coerce.number().positive(),
  costPrice: z.coerce.number().optional().nullable(),
  stockQty: z.coerce.number().int().optional(),
  lowStockAt: z.coerce.number().int().optional(),
  images: z.array(z.string().url().max(2000)).max(5).optional(),
  customFields: z
    .array(
      z.object({
        label: z.string().min(1).max(100),
        value: z.string().max(200),
      })
    )
    .max(20)
    .optional(),
  isActive: z.boolean().optional(),
});

export const createProductSchema = z.object({
  params: z.object({ gymId: z.string().uuid() }),
  body: productBody,
});

export const updateProductSchema = z.object({
  params: z.object({ gymId: z.string().uuid(), productId: z.string().uuid() }),
  body: productBody.partial(),
});

export const productParamsSchema = z.object({
  params: z.object({ gymId: z.string().uuid(), productId: z.string().uuid() }),
});
