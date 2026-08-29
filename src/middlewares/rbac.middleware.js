import { ForbiddenError } from '../utils/errors.js';

const ROLE_HIERARCHY = {
  SUPER_ADMIN: 100,
  GYM_OWNER: 80,
  MANAGER: 60,
  RECEPTIONIST: 40,
  TRAINER: 30,
  MEMBER: 10,
};

export const requireRoles = (...allowedRoles) => (req, _res, next) => {
  if (!req.user) {
    return next(new ForbiddenError('Authentication required'));
  }

  if (req.user.role === 'SUPER_ADMIN') {
    return next();
  }

  if (!allowedRoles.includes(req.user.role)) {
    return next(new ForbiddenError('Insufficient permissions'));
  }

  next();
};

export const requireMinRole = (minRole) => (req, _res, next) => {
  if (!req.user) {
    return next(new ForbiddenError('Authentication required'));
  }

  const userLevel = ROLE_HIERARCHY[req.user.role] || 0;
  const minLevel = ROLE_HIERARCHY[minRole] || 0;

  if (userLevel < minLevel) {
    return next(new ForbiddenError('Insufficient permissions'));
  }

  next();
};

export const PERMISSIONS = {
  GYM_CREATE: 'gym:create',
  GYM_READ: 'gym:read',
  GYM_UPDATE: 'gym:update',
  GYM_DELETE: 'gym:delete',
  MEMBER_CREATE: 'member:create',
  MEMBER_READ: 'member:read',
  MEMBER_UPDATE: 'member:update',
  MEMBER_DELETE: 'member:delete',
  ATTENDANCE_READ: 'attendance:read',
  ATTENDANCE_WRITE: 'attendance:write',
  REPORTS_READ: 'reports:read',
  BILLING_MANAGE: 'billing:manage',
};

const ROLE_PERMISSIONS = {
  SUPER_ADMIN: Object.values(PERMISSIONS),
  GYM_OWNER: Object.values(PERMISSIONS),
  MANAGER: [
    PERMISSIONS.GYM_READ,
    PERMISSIONS.GYM_UPDATE,
    PERMISSIONS.MEMBER_CREATE,
    PERMISSIONS.MEMBER_READ,
    PERMISSIONS.MEMBER_UPDATE,
    PERMISSIONS.ATTENDANCE_READ,
    PERMISSIONS.ATTENDANCE_WRITE,
    PERMISSIONS.REPORTS_READ,
  ],
  RECEPTIONIST: [
    PERMISSIONS.GYM_READ,
    PERMISSIONS.MEMBER_CREATE,
    PERMISSIONS.MEMBER_READ,
    PERMISSIONS.MEMBER_UPDATE,
    PERMISSIONS.ATTENDANCE_READ,
    PERMISSIONS.ATTENDANCE_WRITE,
  ],
  TRAINER: [
    PERMISSIONS.GYM_READ,
    PERMISSIONS.MEMBER_READ,
    PERMISSIONS.ATTENDANCE_READ,
  ],
  MEMBER: [PERMISSIONS.MEMBER_READ],
};

export const requirePermission = (permission) => (req, _res, next) => {
  const userPermissions = ROLE_PERMISSIONS[req.user.role] || [];

  if (!userPermissions.includes(permission)) {
    return next(new ForbiddenError(`Missing permission: ${permission}`));
  }

  next();
};
