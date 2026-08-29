import { z } from 'zod';

const bannerCategory = z.enum(['PROMOTION', 'NEW_CLASS', 'MAINTENANCE', 'APP_EXCLUSIVE']);
const bannerPlacement = z.enum([
  'GLOBAL_HOMEPAGE',
  'CLASSES_SECTION',
  'DASHBOARD_TOP',
  'MEMBER_STORE',
]);
const bannerCtaType = z.enum(['CLASS_BOOKING', 'STORE_PRODUCT', 'EVENT', 'EXTERNAL_URL']);
const bannerStatus = z.enum(['DRAFT', 'ACTIVE', 'SCHEDULED', 'EXPIRED', 'ARCHIVED']);

const bannerBodySchema = z.object({
  name: z.string().min(1).max(200),
  internalCode: z.string().max(50).optional().nullable(),
  category: bannerCategory.optional(),
  placement: bannerPlacement.optional(),
  imageUrl: z
    .union([z.string().url().max(2000), z.literal('')])
    .optional()
    .nullable(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  timeSlots: z.array(z.string()).optional(),
  targetAudience: z.array(z.string()).optional(),
  ctaType: bannerCtaType.optional().nullable(),
  ctaDestination: z.string().max(500).optional().nullable(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  status: bannerStatus.optional(),
});

export const createBannerSchema = z.object({
  params: z.object({ gymId: z.string().uuid() }),
  body: bannerBodySchema,
});

export const updateBannerSchema = z.object({
  params: z.object({
    gymId: z.string().uuid(),
    bannerId: z.string().uuid(),
  }),
  body: bannerBodySchema.partial(),
});

export const bannerParamsSchema = z.object({
  params: z.object({
    gymId: z.string().uuid(),
    bannerId: z.string().uuid(),
  }),
});
