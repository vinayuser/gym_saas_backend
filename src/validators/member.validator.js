import { z } from 'zod';

const memberBodySchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().max(100).optional().default(''),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional().nullable(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  address: z.string().optional(),
  emergencyContact: z.string().optional(),
  emergencyPhone: z.string().optional(),
  medicalNotes: z.string().optional(),
  fitnessGoals: z.string().optional(),
  isActive: z.boolean().optional(),
  profileImage: z.string().url().optional().nullable(),
  planId: z.string().uuid().optional().nullable(),
  membershipStartDate: z.string().optional().nullable(),
});

export const createMemberSchema = z.object({
  params: z.object({ gymId: z.string().uuid() }),
  body: memberBodySchema,
});

export const updateMemberSchema = z.object({
  params: z.object({
    gymId: z.string().uuid(),
    memberId: z.string().uuid(),
  }),
  body: memberBodySchema.partial(),
});

export const memberParamsSchema = z.object({
  params: z.object({
    gymId: z.string().uuid(),
    memberId: z.string().uuid(),
  }),
});

export const gymIdParamSchema = z.object({
  params: z.object({ gymId: z.string().uuid() }),
});
