import { z } from 'zod';

export const listTransactionsQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().optional(),
    limit: z.coerce.number().optional(),
    status: z.string().optional(),
    search: z.string().optional(),
  }),
});

export const transactionIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});
