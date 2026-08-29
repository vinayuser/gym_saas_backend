import jwt from 'jsonwebtoken';
import env from '../config/env.js';

export const signAccessToken = (payload) =>
  jwt.sign(payload, env.jwt.accessSecret, { expiresIn: env.jwt.accessExpiresIn });

export const signRefreshToken = (payload) =>
  jwt.sign(payload, env.jwt.refreshSecret, { expiresIn: env.jwt.refreshExpiresIn });

export const verifyAccessToken = (token) => jwt.verify(token, env.jwt.accessSecret);

export const verifyRefreshToken = (token) => jwt.verify(token, env.jwt.refreshSecret);

export const signTwoFactorPendingToken = (userId) =>
  jwt.sign({ userId, purpose: 'two_factor_login' }, env.jwt.accessSecret, { expiresIn: '5m' });

export const verifyTwoFactorPendingToken = (token) => {
  const payload = jwt.verify(token, env.jwt.accessSecret);
  if (payload.purpose !== 'two_factor_login') {
    throw new Error('Invalid two-factor token');
  }
  return payload;
};
