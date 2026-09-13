import { z } from 'zod';

export const listPlansQuerySchema = z.object({
  query: z.object({
    activeOnly: z.enum(['true', 'false']).optional(),
  }),
});

export const planIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

export const updatePlanSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    name: z.string().min(1).max(120).optional(),
    priceMonthly: z.coerce.number().min(0).optional(),
    priceYearly: z.coerce.number().min(0).optional(),
    gymLimit: z.coerce.number().int().optional(),
    features: z.array(z.string().max(200)).max(50).optional(),
    isActive: z.boolean().optional(),
  }),
});
