import prisma from '../config/database.js';

export const createRefreshToken = (data) => prisma.refreshToken.create({ data });

export const findRefreshToken = (token) =>
  prisma.refreshToken.findFirst({
    where: { token, revokedAt: null },
    include: { user: true },
  });

export const revokeRefreshToken = (token) =>
  prisma.refreshToken.updateMany({
    where: { token },
    data: { revokedAt: new Date() },
  });

export const revokeAllUserTokens = (userId) =>
  prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });

export const revokeOtherUserTokens = (userId, keepToken) =>
  prisma.refreshToken.updateMany({
    where: {
      userId,
      revokedAt: null,
      NOT: { token: keepToken },
    },
    data: { revokedAt: new Date() },
  });

export const listActiveSessions = (userId) =>
  prisma.refreshToken.findMany({
    where: {
      userId,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      token: true,
      userAgent: true,
      ipAddress: true,
      createdAt: true,
      lastUsedAt: true,
      expiresAt: true,
    },
  });

export const revokeSessionById = (userId, sessionId) =>
  prisma.refreshToken.updateMany({
    where: { id: sessionId, userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });

export const touchRefreshToken = (token) =>
  prisma.refreshToken.updateMany({
    where: { token, revokedAt: null },
    data: { lastUsedAt: new Date() },
  });

export const createPasswordReset = (data) => prisma.passwordReset.create({ data });

export const findPasswordReset = (token) =>
  prisma.passwordReset.findFirst({
    where: { token, usedAt: null, expiresAt: { gt: new Date() } },
    include: { user: true },
  });

export const markPasswordResetUsed = (id) =>
  prisma.passwordReset.update({ where: { id }, data: { usedAt: new Date() } });

export const createOtp = (data) => prisma.otpVerification.create({ data });

export const findValidOtp = (userId, code, type) =>
  prisma.otpVerification.findFirst({
    where: {
      userId,
      code,
      type,
      verifiedAt: null,
      expiresAt: { gt: new Date() },
    },
  });

export const markOtpVerified = (id) =>
  prisma.otpVerification.update({ where: { id }, data: { verifiedAt: new Date() } });
