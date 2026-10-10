import { z } from 'zod';

const mediaAdType = z.enum(['VIDEO', 'AUDIO']);

const optionalUrl = z
  .union([z.string().url().max(2000), z.literal(''), z.null()])
  .optional()
  .transform((value) => (value === '' ? null : value));

const mediaAdBody = z.object({
  type: mediaAdType,
  title: z.string().min(1).max(200),
  mediaUrl: z.string().url().max(2000),
  thumbnailUrl: optionalUrl,
  clickUrl: optionalUrl,
  durationSec: z.coerce.number().min(0).max(3600).optional().nullable(),
  fileSize: z.coerce.number().int().min(0).optional().nullable(),
  mimeType: z.string().max(80).optional().nullable(),
  isActive: z.boolean().optional(),
  sortOrder: z.coerce.number().int().optional(),
});

export const listMediaAdsQuerySchema = z.object({
  params: z.object({ gymId: z.string().uuid() }),
  query: z.object({
    type: mediaAdType.optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(50).optional(),
    search: z.string().max(120).optional(),
  }),
});

export const createMediaAdSchema = z.object({
  params: z.object({ gymId: z.string().uuid() }),
  body: mediaAdBody,
});

export const updateMediaAdSchema = z.object({
  params: z.object({
    gymId: z.string().uuid(),
    adId: z.string().uuid(),
  }),
  body: mediaAdBody.partial(),
});

export const mediaAdParamsSchema = z.object({
  params: z.object({
    gymId: z.string().uuid(),
    adId: z.string().uuid(),
  }),
});
