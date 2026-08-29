import * as TenantModel from '../models/TenantModel.js';
import { NotFoundError, ForbiddenError } from '../utils/errors.js';

export const getCurrent = async (tenantId) => {
  if (!tenantId) {
    throw new ForbiddenError('No tenant context');
  }

  const tenant = await TenantModel.findById(tenantId);
  if (!tenant) throw new NotFoundError('Tenant not found');

  const gymCount = await TenantModel.countGyms(tenantId);

  return {
    ...tenant,
    usage: {
      gyms: gymCount,
      gymLimit: tenant.subscription?.plan?.gymLimit ?? 1,
    },
  };
};

export const update = async (tenantId, userId, data) => {
  const tenant = await TenantModel.findById(tenantId);
  if (!tenant) throw new NotFoundError('Tenant not found');

  if (tenant.ownerId !== userId) {
    throw new ForbiddenError('Only the gym owner can update tenant settings');
  }

  return TenantModel.update(tenantId, {
    name: data.name,
    phone: data.phone,
    logo: data.logo,
  });
};
