import { RefreshToken, PasswordReset, OtpVerification, User } from '../schemas/index.js';
import { createDoc, asDoc } from '../helpers/document.js';
import { aggregateOne } from '../helpers/pagination.js';
import { lookupOne } from '../helpers/query.js';
import { COLLECTIONS } from '../helpers/constants.js';
import { userSession } from '../projections/user.projection.js';

export const createRefreshToken = (data) => createDoc(RefreshToken, data);

export const findRefreshToken = (token) =>
  aggregateOne(RefreshToken, {
    match: { token, revokedAt: null },
    lookups: lookupOne(COLLECTIONS.USERS, 'userId', 'user'),
  });

export const revokeRefreshToken = (token) =>
  RefreshToken.updateMany({ token }, { $set: { revokedAt: new Date() } });

export const revokeAllUserTokens = (userId) =>
  RefreshToken.updateMany({ userId, revokedAt: null }, { $set: { revokedAt: new Date() } });

export const revokeOtherUserTokens = (userId, keepToken) =>
  RefreshToken.updateMany(
    { userId, revokedAt: null, token: { $ne: keepToken } },
    { $set: { revokedAt: new Date() } }
  );

export const listActiveSessions = (userId) =>
  RefreshToken.aggregate([
    { $match: { userId, revokedAt: null, expiresAt: { $gt: new Date() } } },
    { $sort: { createdAt: -1 } },
    { $project: userSession },
  ]);

export const revokeSessionById = (userId, sessionId) =>
  RefreshToken.updateMany({ _id: sessionId, userId, revokedAt: null }, { $set: { revokedAt: new Date() } });

export const touchRefreshToken = (token) =>
  RefreshToken.updateMany({ token, revokedAt: null }, { $set: { lastUsedAt: new Date() } });

export const createPasswordReset = (data) => createDoc(PasswordReset, data);

export const findPasswordReset = (token) =>
  aggregateOne(PasswordReset, {
    match: { token, usedAt: null, expiresAt: { $gt: new Date() } },
    lookups: lookupOne(COLLECTIONS.USERS, 'userId', 'user'),
  });

export const markPasswordResetUsed = async (id) =>
  asDoc(await PasswordReset.findByIdAndUpdate(id, { $set: { usedAt: new Date() } }, { returnDocument: 'after' }));

export const createOtp = (data) => createDoc(OtpVerification, data);

export const findValidOtp = async (userId, code, type) =>
  asDoc(
    await OtpVerification.findOne({
      userId,
      code,
      type,
      verifiedAt: null,
      expiresAt: { $gt: new Date() },
    })
  );

export const markOtpVerified = async (id) =>
  asDoc(await OtpVerification.findByIdAndUpdate(id, { $set: { verifiedAt: new Date() } }, { returnDocument: 'after' }));

export const touchUserLogin = (id) => User.findByIdAndUpdate(id, { $set: { lastLoginAt: new Date() } });
