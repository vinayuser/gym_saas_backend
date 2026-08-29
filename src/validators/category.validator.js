import { z } from 'zod';

const categoryBody = z.object({
  name: z.string().min(1).max(100),
});

export const createCategorySchema = z.object({
  params: z.object({ gymId: z.string().uuid() }),
  body: categoryBody,
});

export const updateCategorySchema = z.object({
  params: z.object({ gymId: z.string().uuid(), categoryId: z.string().uuid() }),
  body: categoryBody,
});

export const categoryParamsSchema = z.object({
  params: z.object({ gymId: z.string().uuid(), categoryId: z.string().uuid() }),
});
