import { z } from 'zod';

export const createPlatformRoleSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(60),
    description: z.string().max(240).optional(),
    permissionIds: z.array(z.string().uuid()).default([]),
  }),
});

export const updatePlatformRoleSchema = z.object({
  params: z.object({ roleId: z.string().uuid() }),
  body: z.object({
    name: z.string().min(2).max(60),
    description: z.string().max(240).optional(),
    permissionIds: z.array(z.string().uuid()).default([]),
  }),
});

export const platformRoleIdSchema = z.object({
  params: z.object({ roleId: z.string().uuid() }),
});

export const createPlatformAdminSchema = z.object({
  body: z.object({
    firstName: z.string().min(1).max(60),
    lastName: z.string().min(1).max(60),
    email: z.string().email(),
    phone: z.string().max(20).optional(),
    password: z.string().min(8).max(72),
    roleId: z.string().uuid(),
  }),
});

export const updatePlatformAdminSchema = z.object({
  params: z.object({ userId: z.string().uuid() }),
  body: z.object({
    roleId: z.string().uuid().optional(),
    status: z.enum(['ACTIVE', 'SUSPENDED']).optional(),
    password: z.string().min(8).max(72).optional(),
  }),
});
