import { z } from 'zod';

export const createGymSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(200),
    description: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    pincode: z.string().optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    operatingHours: z.record(z.any()).optional(),
    gstNumber: z.string().optional(),
    taxRate: z.number().min(0).max(100).optional(),
    logo: z.string().url().optional().nullable(),
    coverImage: z.string().url().optional().nullable(),
    primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    themeMode: z.enum(['dark', 'light']).optional(),
    appTagline: z.string().max(120).optional().nullable(),
  }),
});

export const updateGymSchema = z.object({
  params: z.object({ gymId: z.string().uuid() }),
  body: createGymSchema.shape.body.partial(),
});

export const gymIdParamSchema = z.object({
  params: z.object({ gymId: z.string().uuid() }),
});
