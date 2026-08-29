import crypto from 'crypto';
import { generateSecret, generateURI, verify, generateSync } from 'otplib';
import QRCode from 'qrcode';
import env from '../config/env.js';

const getEncryptionKey = () =>
  crypto.createHash('sha256').update(env.jwt.accessSecret).digest();

export const encryptTotpSecret = (secret) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
};

export const decryptTotpSecret = (payload) => {
  if (!payload) return null;
  const [ivB64, tagB64, dataB64] = payload.split(':');
  const iv = Buffer.from(ivB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const data = Buffer.from(dataB64, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', getEncryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
};

export const generateTotpSecret = () => generateSecret();

export const buildTotpUri = (email, secret) =>
  generateURI({ issuer: 'FitSphere Pro', label: email, secret });

export const verifyTotpCode = async (secret, code) => {
  const result = await verify({ token: code, secret });
  return Boolean(result.valid);
};

export const generateTotpQrDataUrl = async (otpauthUrl) =>
  QRCode.toDataURL(otpauthUrl, { margin: 1, width: 220 });

// Dev-only helper for manual testing
export const generateTotpCode = (secret) => generateSync({ secret });
