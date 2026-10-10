import { z } from 'zod';

const memberParams = z.object({ gymId: z.string().uuid(), memberId: z.string().uuid() });

export const memberCareParamsSchema = z.object({ params: memberParams });

export const workoutBodySchema = z.object({
  params: memberParams,
  body: z.object({
    title: z.string().min(1).max(200),
    description: z.string().max(5000).optional().nullable(),
    exercises: z.any().optional().nullable(),
    trainerId: z.string().uuid().optional().nullable(),
    startDate: z.string().optional(),
    endDate: z.string().optional().nullable(),
    isActive: z.boolean().optional(),
  }),
});

export const workoutUpdateSchema = z.object({
  params: memberParams.extend({ planId: z.string().uuid() }),
  body: workoutBodySchema.shape.body.partial(),
});

export const workoutParamsSchema = z.object({
  params: memberParams.extend({ planId: z.string().uuid() }),
});

export const dietBodySchema = z.object({
  params: memberParams,
  body: z.object({
    title: z.string().min(1).max(200),
    description: z.string().max(5000).optional().nullable(),
    meals: z.any().optional().nullable(),
    startDate: z.string().optional(),
    endDate: z.string().optional().nullable(),
    isActive: z.boolean().optional(),
  }),
});

export const dietUpdateSchema = z.object({
  params: memberParams.extend({ planId: z.string().uuid() }),
  body: dietBodySchema.shape.body.partial(),
});

export const dietParamsSchema = z.object({
  params: memberParams.extend({ planId: z.string().uuid() }),
});

export const measurementBodySchema = z.object({
  params: memberParams,
  body: z.object({
    weight: z.coerce.number().optional().nullable(),
    height: z.coerce.number().optional().nullable(),
    chest: z.coerce.number().optional().nullable(),
    waist: z.coerce.number().optional().nullable(),
    hips: z.coerce.number().optional().nullable(),
    biceps: z.coerce.number().optional().nullable(),
    thighs: z.coerce.number().optional().nullable(),
    bodyFat: z.coerce.number().optional().nullable(),
    notes: z.string().max(1000).optional().nullable(),
    measuredAt: z.string().optional(),
  }),
});

export const measurementParamsSchema = z.object({
  params: memberParams.extend({ measurementId: z.string().uuid() }),
});
