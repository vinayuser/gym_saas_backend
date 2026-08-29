import { z } from 'zod';

export const createInviteSchema = z.object({
  body: z.object({
    email: z.string().email(),
    planId: z.string().uuid(),
    inviteeName: z.string().max(120).optional(),
    businessName: z.string().max(200).optional(),
    note: z.string().max(500).optional(),
    expiryDays: z.coerce.number().int().min(1).max(90).optional(),
  }),
});

export const inviteIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

export const inviteTokenParamSchema = z.object({
  params: z.object({
    token: z.string().min(8),
  }),
});

export const checkoutSchema = z.object({
  params: z.object({
    token: z.string().min(8),
  }),
  body: z.object({
    password: z.string().min(8).max(128).optional(),
    businessName: z.string().min(2).max(200).optional(),
    description: z.string().max(5000).optional(),
    contactPhones: z.array(z.string().max(30)).max(3).optional(),
    supportEmails: z.array(z.string().email()).max(3).optional(),
    location: z.string().max(500).optional(),
    city: z.string().max(100).optional(),
    state: z.string().max(100).optional(),
    postalCode: z.string().max(20).optional(),
    firstName: z.string().max(80).optional(),
    lastName: z.string().max(80).optional(),
    logoUrl: z.string().url().max(2000).optional().nullable(),
    videoUrl: z.string().url().max(2000).optional().nullable(),
    photoUrls: z.array(z.string().url().max(2000)).max(5).optional(),
  }),
});

export const verifyPaymentSchema = z.object({
  params: z.object({
    token: z.string().min(8),
  }),
  body: z.object({
    razorpay_order_id: z.string().optional(),
    razorpay_payment_id: z.string().optional(),
    razorpay_signature: z.string().optional(),
    orderId: z.string().optional(),
    paymentId: z.string().optional(),
    signature: z.string().optional(),
  }),
});

export const listInvitesQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().optional(),
    limit: z.coerce.number().optional(),
    status: z.string().optional(),
    search: z.string().optional(),
  }),
});

export const listGymOwnersQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().optional(),
    limit: z.coerce.number().optional(),
    status: z.string().optional(),
    search: z.string().optional(),
  }),
});

export const updateOwnerStatusSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']),
  }),
});
