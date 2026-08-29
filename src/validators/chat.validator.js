import { z } from 'zod';

const messageBody = z
  .object({
    content: z.string().max(4000).optional().nullable(),
    mediaUrl: z.string().url().max(2000).optional().nullable(),
    mediaType: z.enum(['IMAGE', 'VIDEO']).optional().nullable(),
  })
  .refine((b) => (b.content && b.content.trim()) || b.mediaUrl, {
    message: 'Message text or media is required',
  });

export const chatMessageParamsSchema = z.object({
  params: z.object({ gymId: z.string().uuid(), messageId: z.string().uuid() }),
});

export const listChatQuerySchema = z.object({
  params: z.object({ gymId: z.string().uuid() }),
  query: z.object({
    limit: z.coerce.number().int().positive().max(200).optional(),
  }),
});

export const createChatMessageSchema = z.object({
  params: z.object({ gymId: z.string().uuid() }),
  body: messageBody,
});

export const updateChatMessageSchema = z.object({
  params: z.object({ gymId: z.string().uuid(), messageId: z.string().uuid() }),
  body: z.object({
    content: z.string().min(1).max(4000),
  }),
});

export const pinChatMessageSchema = z.object({
  params: z.object({ gymId: z.string().uuid(), messageId: z.string().uuid() }),
  body: z.object({
    isPinned: z.boolean(),
  }),
});
