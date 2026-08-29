import { z } from 'zod';

const planBody = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  billingCycle: z.enum(['MONTHLY', 'QUARTERLY', 'YEARLY']),
  price: z.coerce.number().positive(),
  durationDays: z.coerce.number().int().positive(),
  features: z.any().optional(),
  isActive: z.boolean().optional(),
});

export const createPlanSchema = z.object({
  params: z.object({ gymId: z.string().uuid() }),
  body: planBody,
});

export const updatePlanSchema = z.object({
  params: z.object({ gymId: z.string().uuid(), planId: z.string().uuid() }),
  body: planBody.partial(),
});

export const planParamsSchema = z.object({
  params: z.object({ gymId: z.string().uuid(), planId: z.string().uuid() }),
});
