import { v4 as uuidv4 } from 'uuid';
import prisma from '../config/database.js';
import * as UserModel from '../models/UserModel.js';
import * as AuthModel from '../models/AuthModel.js';
import * as TenantModel from '../models/TenantModel.js';
import * as GymModel from '../models/GymModel.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken, signTwoFactorPendingToken, verifyTwoFactorPendingToken } from '../utils/jwt.js';
import {
  generateTotpSecret,
  buildTotpUri,
  verifyTotpCode,
  generateTotpQrDataUrl,
  encryptTotpSecret,
  decryptTotpSecret,
} from '../utils/totp.js';
import {
  BadRequestError,
  ConflictError,
  UnauthorizedError,
  NotFoundError,
} from '../utils/errors.js';
import { normalizeNotificationPreferences } from '../constants/notificationPreferences.js';

const slugify = (text) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));

const sanitizeUser = (user) => {
  const { password, tenant, roleAssignments, totpSecret, ...safe } = user;
  return {
    ...safe,
    notificationPreferences: normalizeNotificationPreferences(safe.notificationPreferences),
  };
};

const loadGymsForTenant = async (tenantId, limit = 100) => {
  if (!tenantId) return [];
  const [gyms] = await GymModel.findMany(tenantId, {
    skip: 0,
    limit,
    sortBy: 'name',
    sortOrder: 'asc',
  });
  return gyms;
};

const issueTokens = async (userId, email, role, tenantId, sessionMeta = {}) => {
  const payload = { userId, email, role, tenantId };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken({ userId });

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await AuthModel.createRefreshToken({
    userId,
    token: refreshToken,
    expiresAt,
    userAgent: sessionMeta.userAgent?.slice(0, 512) || null,
    ipAddress: sessionMeta.ipAddress || null,
    lastUsedAt: new Date(),
  });

  return { accessToken, refreshToken };
};

const completeLogin = async (user, sessionMeta) => {
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const tokens = await issueTokens(user.id, user.email, user.role, user.tenantId, sessionMeta);
  const gyms = await loadGymsForTenant(user.tenantId);

  return {
    user: sanitizeUser(user),
    tenant: user.tenant,
    gyms,
    tokens,
  };
};

export const register = async ({ email, password, firstName, lastName, phone, businessName }) => {
  const normalizedEmail = email.toLowerCase();

  const existing = await UserModel.findByEmail(normalizedEmail, null);
  if (existing) {
    throw new ConflictError('Email already registered');
  }

  let slug = slugify(businessName);
  const slugExists = await TenantModel.findBySlug(slug);
  if (slugExists) slug = `${slug}-${Date.now().toString(36)}`;

  const hashedPassword = await hashPassword(password);

  const trialPlan = await prisma.subscriptionPlan.findFirst({
    where: { type: 'SINGLE_GYM', isActive: true },
  });

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
        firstName,
        lastName,
        phone,
        role: 'GYM_OWNER',
        status: 'PENDING_VERIFICATION',
      },
    });

    const tenant = await tx.tenant.create({
      data: {
        name: businessName,
        slug,
        email: normalizedEmail,
        phone,
        ownerId: user.id,
      },
    });

    await tx.user.update({
      where: { id: user.id },
      data: { tenantId: tenant.id },
    });

    if (trialPlan) {
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 14);

      await tx.subscription.create({
        data: {
          tenantId: tenant.id,
          planId: trialPlan.id,
          status: 'TRIAL',
          trialEndsAt: trialEnd,
          currentPeriodStart: new Date(),
          currentPeriodEnd: trialEnd,
        },
      });
    }

    const otp = generateOtp();
    await tx.otpVerification.create({
      data: {
        userId: user.id,
        code: otp,
        type: 'email_verify',
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      },
    });

    return { user, tenant, otp };
  });

  const tokens = await issueTokens(result.user.id, result.user.email, result.user.role, result.tenant.id);

  return {
    user: sanitizeUser({ ...result.user, tenantId: result.tenant.id }),
    tenant: { id: result.tenant.id, name: result.tenant.name, slug: result.tenant.slug },
    tokens,
    ...(process.env.NODE_ENV === 'development' ? { devOtp: result.otp } : {}),
  };
};

export const login = async ({ email, password }, sessionMeta = {}) => {
  const normalizedEmail = email.toLowerCase();
  const user = await prisma.user.findFirst({
    where: { email: normalizedEmail, deletedAt: null },
    include: { tenant: { select: { id: true, name: true, slug: true, isActive: true } } },
  });

  if (!user) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const valid = await comparePassword(password, user.password);
  if (!valid) {
    throw new UnauthorizedError('Invalid email or password');
  }

  if (user.status === 'SUSPENDED') {
    throw new UnauthorizedError('Account suspended');
  }

  if (user.twoFactorEnabled) {
    return {
      requiresTwoFactor: true,
      twoFactorToken: signTwoFactorPendingToken(user.id),
    };
  }

  return completeLogin(user, sessionMeta);
};

export const verifyTwoFactorLogin = async ({ twoFactorToken, code }, sessionMeta = {}) => {
  let payload;
  try {
    payload = verifyTwoFactorPendingToken(twoFactorToken);
  } catch {
    throw new UnauthorizedError('Two-factor session expired. Please sign in again.');
  }

  const user = await prisma.user.findFirst({
    where: { id: payload.userId, deletedAt: null },
    include: { tenant: { select: { id: true, name: true, slug: true, isActive: true } } },
  });

  if (!user?.twoFactorEnabled || !user.totpSecret) {
    throw new BadRequestError('Two-factor authentication is not enabled');
  }

  const secret = decryptTotpSecret(user.totpSecret);
  if (!(await verifyTotpCode(secret, code))) {
    throw new UnauthorizedError('Invalid authentication code');
  }

  return completeLogin(user, sessionMeta);
};

export const refresh = async (refreshToken) => {
  try {
    verifyRefreshToken(refreshToken);
  } catch {
    throw new UnauthorizedError('Invalid refresh token');
  }

  const stored = await AuthModel.findRefreshToken(refreshToken);
  if (!stored || stored.expiresAt < new Date()) {
    throw new UnauthorizedError('Refresh token expired or revoked');
  }

  await AuthModel.touchRefreshToken(refreshToken);

  const tokens = await issueTokens(
    stored.user.id,
    stored.user.email,
    stored.user.role,
    stored.user.tenantId
  );

  await AuthModel.revokeRefreshToken(refreshToken);

  return { tokens };
};

export const logout = async (refreshToken) => {
  if (refreshToken) {
    await AuthModel.revokeRefreshToken(refreshToken);
  }
  return { message: 'Logged out successfully' };
};

export const getProfile = async (userId) => {
  const user = await UserModel.findById(userId);
  if (!user) throw new NotFoundError('User not found');

  const gyms = await loadGymsForTenant(user.tenantId);

  return {
    user: sanitizeUser(user),
    tenant: user.tenant,
    gyms,
  };
};

export const forgotPassword = async (email) => {
  const user = await UserModel.findByEmail(email.toLowerCase());
  if (!user) {
    return { message: 'If the email exists, a reset link has been sent' };
  }

  const token = uuidv4();
  await AuthModel.createPasswordReset({
    userId: user.id,
    token,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
  });

  return {
    message: 'If the email exists, a reset link has been sent',
    ...(process.env.NODE_ENV === 'development' ? { devResetToken: token } : {}),
  };
};

export const resetPassword = async ({ token, password }) => {
  const reset = await AuthModel.findPasswordReset(token);
  if (!reset) throw new BadRequestError('Invalid or expired reset token');

  const hashedPassword = await hashPassword(password);
  await UserModel.update(reset.userId, { password: hashedPassword });
  await AuthModel.markPasswordResetUsed(reset.id);
  await AuthModel.revokeAllUserTokens(reset.userId);

  return { message: 'Password reset successfully' };
};

export const verifyOtp = async ({ email, code, type }) => {
  const user = await UserModel.findByEmail(email.toLowerCase());
  if (!user) throw new NotFoundError('User not found');

  const otp = await AuthModel.findValidOtp(user.id, code, type);
  if (!otp) throw new BadRequestError('Invalid or expired OTP');

  await AuthModel.markOtpVerified(otp.id);

  if (type === 'email_verify') {
    await UserModel.update(user.id, {
      emailVerified: true,
      emailVerifiedAt: new Date(),
      status: 'ACTIVE',
    });
  }

  return { message: 'Verification successful' };
};

export const changePassword = async (userId, { currentPassword, newPassword, refreshToken }) => {
  const user = await UserModel.findById(userId);
  if (!user) throw new NotFoundError('User not found');

  const valid = await comparePassword(currentPassword, user.password);
  if (!valid) {
    throw new UnauthorizedError('Current password is incorrect');
  }

  const hashedPassword = await hashPassword(newPassword);
  await UserModel.update(userId, { password: hashedPassword });

  if (refreshToken) {
    await AuthModel.revokeOtherUserTokens(userId, refreshToken);
  } else {
    await AuthModel.revokeAllUserTokens(userId);
  }

  return { message: 'Password updated successfully' };
};

export const listSessions = async (userId, currentRefreshToken) => {
  const sessions = await AuthModel.listActiveSessions(userId);

  return {
    sessions: sessions.map((session) => ({
      id: session.id,
      userAgent: session.userAgent,
      ipAddress: session.ipAddress,
      createdAt: session.createdAt,
      lastUsedAt: session.lastUsedAt,
      expiresAt: session.expiresAt,
      isCurrent: Boolean(currentRefreshToken && session.token === currentRefreshToken),
    })),
  };
};

export const revokeSession = async (userId, sessionId, currentRefreshToken) => {
  const sessions = await AuthModel.listActiveSessions(userId);
  const target = sessions.find((s) => s.id === sessionId);
  if (!target) throw new NotFoundError('Session not found');

  if (currentRefreshToken && target.token === currentRefreshToken) {
    throw new BadRequestError('Cannot revoke your current session from here. Sign out instead.');
  }

  await AuthModel.revokeSessionById(userId, sessionId);
  return { message: 'Session revoked' };
};

export const revokeOtherSessions = async (userId, currentRefreshToken) => {
  if (!currentRefreshToken) {
    throw new BadRequestError('Current session token is required');
  }

  await AuthModel.revokeOtherUserTokens(userId, currentRefreshToken);
  return { message: 'Other sessions revoked' };
};

export const getTwoFactorStatus = async (userId) => {
  const user = await UserModel.findById(userId);
  if (!user) throw new NotFoundError('User not found');

  return {
    enabled: Boolean(user.twoFactorEnabled),
    confirmedAt: user.twoFactorConfirmedAt,
  };
};

export const setupTwoFactor = async (userId) => {
  const user = await UserModel.findById(userId);
  if (!user) throw new NotFoundError('User not found');

  if (user.twoFactorEnabled) {
    throw new BadRequestError('Two-factor authentication is already enabled');
  }

  const secret = generateTotpSecret();
  const otpauthUrl = buildTotpUri(user.email, secret);
  const qrCodeDataUrl = await generateTotpQrDataUrl(otpauthUrl);

  await UserModel.update(userId, {
    totpSecret: encryptTotpSecret(secret),
    twoFactorEnabled: false,
    twoFactorConfirmedAt: null,
  });

  return {
    secret,
    otpauthUrl,
    qrCodeDataUrl,
  };
};

export const verifyTwoFactorSetup = async (userId, code) => {
  const user = await UserModel.findById(userId);
  if (!user?.totpSecret) {
    throw new BadRequestError('Start two-factor setup first');
  }

  const secret = decryptTotpSecret(user.totpSecret);
  if (!(await verifyTotpCode(secret, code))) {
    throw new BadRequestError('Invalid authentication code');
  }

  await UserModel.update(userId, {
    twoFactorEnabled: true,
    twoFactorConfirmedAt: new Date(),
  });

  return { message: 'Two-factor authentication enabled', enabled: true };
};

export const disableTwoFactor = async (userId, { password, code }) => {
  const user = await UserModel.findById(userId);
  if (!user) throw new NotFoundError('User not found');

  if (!user.twoFactorEnabled) {
    throw new BadRequestError('Two-factor authentication is not enabled');
  }

  const valid = await comparePassword(password, user.password);
  if (!valid) {
    throw new UnauthorizedError('Password is incorrect');
  }

  const secret = decryptTotpSecret(user.totpSecret);
  if (!(await verifyTotpCode(secret, code))) {
    throw new BadRequestError('Invalid authentication code');
  }

  await UserModel.update(userId, {
    twoFactorEnabled: false,
    totpSecret: null,
    twoFactorConfirmedAt: null,
  });

  return { message: 'Two-factor authentication disabled', enabled: false };
};

export const updateNotificationPreferences = async (userId, preferences) => {
  const user = await UserModel.findById(userId);
  if (!user) throw new NotFoundError('User not found');

  const normalized = normalizeNotificationPreferences(preferences);
  const updated = await UserModel.update(userId, {
    notificationPreferences: normalized,
  });

  return {
    message: 'Notification preferences saved',
    notificationPreferences: normalizeNotificationPreferences(updated.notificationPreferences),
  };
};
