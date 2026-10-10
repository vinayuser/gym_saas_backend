import { z } from 'zod';

export const createBroadcastSchema = z.object({
  body: z.object({
    message: z.string().trim().min(1, 'Message is required').max(280),
  }),
});
