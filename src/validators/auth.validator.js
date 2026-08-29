import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8).max(128),
    firstName: z.string().min(1).max(100),
    lastName: z.string().min(1).max(100),
    phone: z.string().optional(),
    businessName: z.string().min(2).max(200),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1),
  }),
});

export const refreshTokenSchema = z.object({
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
  }),
});

export const verifyOtpSchema = z.object({
  body: z.object({
    email: z.string().email(),
    code: z.string().length(6),
    type: z.enum(['email_verify', 'phone_verify', 'login']).default('email_verify'),
  }),
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8).max(128),
    refreshToken: z.string().optional(),
  }),
});

export const twoFactorVerifySchema = z.object({
  body: z.object({
    code: z.string().length(6),
  }),
});

export const twoFactorDisableSchema = z.object({
  body: z.object({
    password: z.string().min(1),
    code: z.string().length(6),
  }),
});

export const twoFactorLoginSchema = z.object({
  body: z.object({
    twoFactorToken: z.string().min(1),
    code: z.string().length(6),
  }),
});

export const revokeSessionSchema = z.object({
  params: z.object({
    sessionId: z.string().uuid(),
  }),
  query: z
    .object({
      refreshToken: z.string().optional(),
    })
    .optional(),
  body: z
    .object({
      refreshToken: z.string().optional(),
    })
    .optional(),
});

export const revokeOtherSessionsSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1),
  }),
});

export const notificationPreferencesSchema = z.object({
  body: z.object({
    emailAlerts: z.boolean(),
    smsReminders: z.boolean(),
    pushNotifications: z.boolean(),
    weeklyDigest: z.boolean(),
  }),
});
