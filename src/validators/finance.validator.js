import { z } from 'zod';

export const financeCategory = z.enum(['ALL', 'SUBSCRIPTIONS', 'STORE_SALES', 'INVOICES']);

const truthyQueryFlag = z.preprocess(
  (value) => value === true || value === 'true' || value === '1',
  z.boolean().optional()
);

export const financeQuerySchema = z.object({
  params: z.object({ gymId: z.string().uuid() }),
  query: z
    .object({
      category: financeCategory.optional(),
      page: z.coerce.number().int().positive().optional(),
      limit: z.coerce.number().int().positive().optional(),
      export: truthyQueryFlag,
    })
    .superRefine((query, ctx) => {
      if (query.export) return;
      if (query.limit != null && query.limit > 100) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Limit cannot exceed 100',
          path: ['limit'],
        });
      }
    }),
});

export const financeOverviewQuerySchema = z.object({
  params: z.object({ gymId: z.string().uuid() }),
  query: z.object({
    category: financeCategory.optional(),
  }),
});
