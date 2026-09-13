import { z } from 'zod';

export const listTenantsQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().optional(),
    limit: z.coerce.number().optional(),
    status: z.enum(['ALL', 'ACTIVE', 'INACTIVE']).optional(),
    search: z.string().optional(),
  }),
});

export const updateTenantStatusSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    isActive: z.boolean(),
  }),
});

export const updateTenantFeaturesSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    features: z.object({
      banners: z.boolean().optional(),
      store: z.boolean().optional(),
      finances: z.boolean().optional(),
      events: z.boolean().optional(),
      chat: z.boolean().optional(),
      trainers: z.boolean().optional(),
      leads: z.boolean().optional(),
      attendance: z.boolean().optional(),
    }),
  }),
});
