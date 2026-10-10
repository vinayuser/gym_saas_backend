import { z } from 'zod';

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1),
    rememberDevice: z.boolean().optional(),
  }),
});

export const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1),
  }),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email(),
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(1),
    password: z.string().min(8).max(128),
    confirmPassword: z.string().min(8).max(128).optional(),
  }),
});

export const verifyOtpSchema = z.object({
  body: z.object({
    email: z.string().email(),
    code: z.string().length(6),
    type: z.enum(['email_verify', 'phone_verify', 'login']).default('email_verify'),
  }),
});

export const twoFactorSchema = z.object({
  body: z.object({
    twoFactorToken: z.string().min(1),
    code: z.string().length(6),
  }),
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8).max(128),
    confirmPassword: z.string().min(8).max(128).optional(),
    refreshToken: z.string().optional(),
  }),
});

export const updateProfileSchema = z.object({
  body: z.object({
    firstName: z.string().min(1).max(100).optional(),
    lastName: z.string().min(1).max(100).optional(),
    phone: z.string().max(30).optional().nullable(),
    profileImage: z.string().max(500).optional().nullable(),
    emergencyContact: z.string().max(100).optional().nullable(),
    emergencyPhone: z.string().max(30).optional().nullable(),
    fitnessGoals: z.string().max(500).optional().nullable(),
  }),
});

export const updateSlotSchema = z.object({
  body: z.object({
    label: z.string().max(100).optional(),
    startTime: z.string().min(1),
    endTime: z.string().min(1),
    days: z.string().max(100).optional(),
  }),
});

export const notificationSettingsSchema = z.object({
  body: z.object({
    emailAlerts: z.boolean().optional(),
    smsReminders: z.boolean().optional(),
    pushNotifications: z.boolean().optional(),
    weeklyDigest: z.boolean().optional(),
  }),
});

export const cartAddSchema = z.object({
  body: z.object({
    productId: z.string().min(1),
    quantity: z.coerce.number().int().min(1).default(1),
  }),
});

export const cartUpdateSchema = z.object({
  params: z.object({ productId: z.string().min(1) }),
  body: z.object({
    quantity: z.coerce.number().int().min(0),
  }),
});

export const placeOrderSchema = z.object({
  body: z
    .object({
      items: z
        .array(
          z.object({
            productId: z.string().min(1),
            quantity: z.number().int().min(1),
          })
        )
        .optional(),
      notes: z.string().max(500).optional(),
      fulfillmentType: z.enum(['PICKUP', 'DELIVERY']).optional(),
    })
    .default({}),
});

export const dayPassCheckoutSchema = z.object({
  body: z
    .object({
      gymId: z.string().min(1),
      validOn: z.string().min(1).optional(),
      date: z.string().min(1).optional(),
    })
    .refine((b) => Boolean(b.validOn || b.date), {
      message: 'validOn or date is required',
      path: ['validOn'],
    }),
});

export const dayPassVerifySchema = z.object({
  body: z.object({
    orderId: z.string().optional(),
    razorpay_order_id: z.string().optional(),
    paymentId: z.string().optional(),
    razorpay_payment_id: z.string().optional(),
    signature: z.string().optional(),
    razorpay_signature: z.string().optional(),
    failed: z.boolean().optional(),
    failureReason: z.string().optional(),
  }),
});

export const chatSendSchema = z.object({
  body: z.object({
    content: z.string().max(2000).optional(),
    mediaUrl: z.string().url().optional().nullable(),
    mediaType: z.string().max(50).optional().nullable(),
  }),
});

export const markReadSchema = z.object({
  body: z
    .object({
      ids: z.array(z.string()).optional(),
      notificationIds: z.array(z.string()).optional(),
    })
    .default({}),
});
