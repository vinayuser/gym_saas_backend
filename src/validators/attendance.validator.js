import { z } from 'zod';

export const checkInSchema = z.object({
  params: z.object({ gymId: z.string().uuid() }),
  body: z.object({
    memberId: z.string().uuid(),
    source: z.enum(['QR_CODE', 'PUNCH', 'FRONTDESK', 'MOBILE', 'BIOMETRIC']).optional(),
  }),
});
