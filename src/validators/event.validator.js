import { z } from 'zod';

const eventBody = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional().nullable(),
  type: z
    .enum(['ZUMBA', 'YOGA', 'OUTDOOR', 'WORKSHOP', 'PERSONAL_TRAINING', 'OTHER'])
    .optional(),
  trainerId: z.string().uuid().optional().nullable(),
  startAt: z.string(),
  endAt: z.string(),
  location: z.string().max(200).optional().nullable(),
  seatLimit: z.coerce.number().int().positive().optional().nullable(),
  price: z.coerce.number().optional().nullable(),
  isActive: z.boolean().optional(),
  imageUrl: z.string().url().optional().nullable(),
  recurrence: z.enum(['NONE', 'DAILY', 'WEEKLY', 'MONTHLY']).optional(),
  recurrenceEndAt: z.string().optional().nullable(),
  recurrenceWeekdays: z.array(z.coerce.number().int().min(0).max(6)).optional(),
  recurrenceWeekOfMonth: z.coerce.number().int().min(1).max(5).optional().nullable(),
  recurrenceDayOfWeek: z.coerce.number().int().min(0).max(6).optional().nullable(),
});

export const createEventSchema = z.object({
  params: z.object({ gymId: z.string().uuid() }),
  body: eventBody,
});

export const updateEventSchema = z.object({
  params: z.object({ gymId: z.string().uuid(), eventId: z.string().uuid() }),
  body: eventBody.partial(),
});

export const eventParamsSchema = z.object({
  params: z.object({ gymId: z.string().uuid(), eventId: z.string().uuid() }),
});
