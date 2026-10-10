import * as AuthService from '../../../services/AuthService.js';
import { ForbiddenError } from '../../../utils/errors.js';
import { Member, Gym } from '../../../schemas/index.js';
import { asDoc } from '../../../helpers/document.js';
import { notDeleted } from '../../../helpers/query.js';
import { loadActiveMembership, sessionMetaFromReq } from './memberContext.js';
import { toMemberSummaryDto } from '../dto/member.dto.js';

const ensureMemberLogin = (user) => {
  if (user?.role && user.role !== 'MEMBER') {
    throw new ForbiddenError('This login is for gym members only');
  }
};

const loadMemberBundle = async (userId) => {
  const member = asDoc(await Member.findOne({ userId, ...notDeleted }));
  if (!member) return null;
  const gym = asDoc(await Gym.findOne({ _id: member.gymId, ...notDeleted }));
  const membership = await loadActiveMembership(member.id);
  return toMemberSummaryDto(member, gym, membership);
};

const shapeAuthSuccess = async (result) => {
  if (result.requiresTwoFactor) {
    return {
      requiresTwoFactor: true,
      twoFactorToken: result.twoFactorToken,
    };
  }

  ensureMemberLogin(result.user);
  const member = await loadMemberBundle(result.user.id);

  return {
    accessToken: result.tokens.accessToken,
    refreshToken: result.tokens.refreshToken,
    expiresIn: 900,
    user: {
      id: result.user.id,
      email: result.user.email,
      firstName: result.user.firstName,
      lastName: result.user.lastName,
      role: result.user.role,
      emailVerified: Boolean(result.user.emailVerified),
    },
    member,
  };
};

export const login = async (body, req) => {
  const result = await AuthService.login(body, sessionMetaFromReq(req));
  return shapeAuthSuccess(result);
};

export const verifyTwoFactor = async (body, req) => {
  const result = await AuthService.verifyTwoFactorLogin(body, sessionMetaFromReq(req));
  return shapeAuthSuccess(result);
};

export const refresh = async (body) => {
  const result = await AuthService.refresh(body.refreshToken);
  return {
    accessToken: result.tokens.accessToken,
    refreshToken: result.tokens.refreshToken,
    expiresIn: 900,
  };
};

export const logout = async (body) => AuthService.logout(body.refreshToken);

export const forgotPassword = async (body) => AuthService.forgotPassword(body.email);

export const resetPassword = async (body) => {
  await AuthService.resetPassword({ token: body.token, password: body.password });
  return {
    message: 'Password updated',
    changedAt: new Date().toISOString(),
  };
};

export const verifyOtp = async (body) => AuthService.verifyOtp(body);

export const changePassword = async (userId, body) => {
  await AuthService.changePassword(userId, {
    currentPassword: body.currentPassword,
    newPassword: body.newPassword,
    refreshToken: body.refreshToken,
  });
  return {
    message: 'Password updated',
    changedAt: new Date().toISOString(),
  };
};

export const me = async (userId) => {
  const profile = await AuthService.getProfile(userId);
  ensureMemberLogin(profile.user);
  const member = await loadMemberBundle(userId);
  return {
    user: {
      id: profile.user.id,
      email: profile.user.email,
      firstName: profile.user.firstName,
      lastName: profile.user.lastName,
      role: profile.user.role,
      emailVerified: Boolean(profile.user.emailVerified),
      notificationPreferences: profile.user.notificationPreferences || null,
    },
    member,
  };
};
