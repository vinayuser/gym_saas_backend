import { z } from 'zod';

export const createInviteSchema = z.object({
  body: z
    .object({
      email: z.string().email().optional(),
      planId: z.string().uuid().optional(),
      inviteeName: z.string().max(120).optional(),
      businessName: z.string().min(2).max(200),
      note: z.string().max(500).optional(),
      expiryDays: z.coerce.number().int().min(1).max(90).optional(),
      purpose: z.enum(['ONBOARD', 'EXTRA_BRANCH']).optional(),
      existingTenantId: z.string().uuid().optional(),
      parentInviteId: z.string().uuid().optional(),
    })
    .superRefine((body, ctx) => {
      const purpose = body.purpose || 'ONBOARD';
      if (purpose === 'EXTRA_BRANCH') {
        if (!body.existingTenantId && !body.parentInviteId) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'existingTenantId or parentInviteId is required for an extra branch invite',
            path: ['existingTenantId'],
          });
        }
        return;
      }
      if (!body.email) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'email is required',
          path: ['email'],
        });
      }
    }),
});

export const inviteIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

export const inviteRecordsQuerySchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  query: z.object({
    gymId: z.string().uuid().optional(),
    resource: z.enum([
      'members',
      'staff',
      'trainers',
      'plans',
      'payments',
      'invoices',
      'attendance',
      'orders',
      'products',
      'events',
      'leads',
      'banners',
    ]),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(50).optional(),
    search: z.string().max(120).optional(),
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
    addonKeys: z.array(z.string().min(1).max(40)).max(10).optional(),
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
    status: z.enum(['ALL', 'PENDING', 'SENT', 'PAYMENT_PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED']).optional(),
    search: z.string().max(120).optional(),
  }),
});

export const publishAppSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    appAlias: z.string().min(2).max(60).optional(),
    appPublished: z.boolean().optional(),
    adsEnabled: z.boolean().optional(),
  }),
});

export const appAdsSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z
    .object({
      gymId: z.string().uuid().optional(),
      banners: z.boolean().optional(),
      video: z.boolean().optional(),
      audio: z.boolean().optional(),
    })
    .refine((body) => ['banners', 'video', 'audio'].some((key) => typeof body[key] === 'boolean'), {
      message: 'Provide at least one app ad flag',
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

export const resetOwnerPasswordSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    password: z.string().min(8).max(72),
  }),
});
