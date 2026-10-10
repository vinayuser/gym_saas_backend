import { z } from 'zod';

export const listDayPassSchema = z.object({
  params: z.object({ gymId: z.string().uuid() }),
});

export const createDayPassSchema = z.object({
  params: z.object({ gymId: z.string().uuid() }),
  body: z.object({
    guestName: z.string().min(1).max(200),
    phone: z.string().max(30).optional().nullable(),
    email: z.string().email().optional().nullable(),
    amount: z.coerce.number().min(0).optional(),
    paid: z.boolean().optional(),
    validOn: z.string().optional(),
    notes: z.string().max(1000).optional().nullable(),
  }),
});

export const dayPassParamsSchema = z.object({
  params: z.object({ gymId: z.string().uuid(), passId: z.string().uuid() }),
});
