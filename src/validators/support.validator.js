import { z } from 'zod';

export const createSupportTicketSchema = z.object({
  body: z.object({
    category: z.enum([
      'GENERAL',
      'BILLING_SUBSCRIPTION',
      'PLAN_CHANGE',
      'TECHNICAL',
      'ACCOUNT_ACCESS',
      'FEATURE_REQUEST',
    ]),
    subject: z.string().trim().min(3).max(200),
    message: z.string().trim().min(10).max(5000),
    replyEmail: z.string().email().optional(),
  }),
});

export const listSupportTicketsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().optional(),
    status: z.enum(['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']).optional(),
    category: z
      .enum([
        'ALL',
        'GENERAL',
        'BILLING_SUBSCRIPTION',
        'PLAN_CHANGE',
        'TECHNICAL',
        'ACCOUNT_ACCESS',
        'FEATURE_REQUEST',
      ])
      .optional(),
    search: z.string().optional(),
  }),
});

export const updateSupportTicketStatusSchema = z.object({
  params: z.object({
    ticketId: z.string().uuid(),
  }),
  body: z.object({
    status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']),
  }),
});
