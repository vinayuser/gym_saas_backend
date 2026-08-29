import { ForbiddenError, BadRequestError } from '../utils/errors.js';
import prisma from '../config/database.js';

/**
 * Ensures tenant context is set and user belongs to the tenant.
 * Super admins can access any tenant via x-tenant-id header.
 */
export const resolveTenant = async (req, _res, next) => {
  try {
    const { user } = req;
    let tenantId = user.tenantId;

    if (user.role === 'SUPER_ADMIN') {
      tenantId = req.headers['x-tenant-id'] || req.query.tenantId || tenantId;
    }

    if (!tenantId && user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenError('No tenant associated with this account');
    }

    if (tenantId) {
      const tenant = await prisma.tenant.findFirst({
        where: { id: tenantId, deletedAt: null, isActive: true },
      });

      if (!tenant) {
        throw new BadRequestError('Invalid or inactive tenant');
      }

      req.tenant = tenant;
      req.tenantId = tenant.id;
    }

    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Validates gym belongs to current tenant.
 */
export const validateGymAccess = async (req, _res, next) => {
  try {
    const gymId = req.params.gymId || req.body.gymId || req.query.gymId;

    if (!gymId) {
      throw new BadRequestError('Gym ID is required');
    }

    const gym = await prisma.gym.findFirst({
      where: {
        id: gymId,
        deletedAt: null,
        ...(req.tenantId ? { tenantId: req.tenantId } : {}),
      },
    });

    if (!gym) {
      throw new ForbiddenError('Gym not found or access denied');
    }

    req.gym = gym;
    req.gymId = gym.id;
    next();
  } catch (err) {
    next(err);
  }
};
