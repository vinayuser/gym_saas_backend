import { z } from 'zod';

const staffRoleEnum = z.enum(['trainer', 'front-desk', 'manager', 'nutritionist']);

const staffBodySchema = z.object({
  fullName: z.string().min(1).max(200).optional(),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().max(100).optional(),
  email: z.string().email(),
  phone: z.string().optional(),
  password: z.string().min(8).optional(),
  avatar: z.string().url().max(2000).optional().nullable(),
  staffRole: staffRoleEnum,
  designation: z.string().max(100).optional(),
  specializations: z.array(z.string()).optional(),
  bio: z.string().max(2000).optional(),
  joinedAt: z.string().optional(),
  employmentType: z.string().max(50).optional(),
  baseRate: z.coerce.number().nonnegative().optional(),
  baseSalary: z.coerce.number().nonnegative().optional(),
  salaryCurrency: z.string().max(10).optional(),
  paymentFrequency: z.enum(['monthly', 'weekly', 'bi-weekly']).optional(),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  pincode: z.string().max(20).optional(),
  addressProofUrl: z.string().url().max(2000).optional().nullable(),
  idProofUrl: z.string().url().max(2000).optional().nullable(),
  mobileAppAccess: z.boolean().optional(),
  adminDashboardAccess: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export const createStaffSchema = z.object({
  params: z.object({ gymId: z.string().uuid() }),
  body: staffBodySchema.refine(
    (data) => data.fullName || data.firstName,
    { message: 'Full name or first name is required' }
  ),
});

export const updateStaffSchema = z.object({
  params: z.object({
    gymId: z.string().uuid(),
    staffId: z.string().uuid(),
  }),
  body: staffBodySchema.partial(),
});

export const staffParamsSchema = z.object({
  params: z.object({
    gymId: z.string().uuid(),
    staffId: z.string().uuid(),
  }),
});
