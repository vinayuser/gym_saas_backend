import QRCode from 'qrcode';
import * as MemberModel from '../models/MemberModel.js';
import * as GymModel from '../models/GymModel.js';
import * as PlanModel from '../models/MembershipPlanModel.js';
import { NotFoundError, BadRequestError } from '../utils/errors.js';
import { parsePagination, buildPaginationMeta } from '../utils/response.js';

const validateGym = async (tenantId, gymId) => {
  const gym = await GymModel.findById(gymId, tenantId);
  if (!gym) throw new NotFoundError('Gym not found');
  return gym;
};

export const list = async (tenantId, gymId, query) => {
  await validateGym(tenantId, gymId);

  const pagination = parsePagination(query);
  const isActive = query.isActive === 'false' ? false : query.isActive === 'true' ? true : undefined;

  const [members, total] = await MemberModel.findMany(gymId, {
    ...pagination,
    isActive,
    search: pagination.search,
  });

  return {
    members,
    pagination: buildPaginationMeta(total, pagination.page, pagination.limit),
  };
};

export const getById = async (tenantId, gymId, memberId) => {
  await validateGym(tenantId, gymId);

  const member = await MemberModel.findById(memberId, gymId);
  if (!member) throw new NotFoundError('Member not found');
  return member;
};

export const create = async (tenantId, gymId, data) => {
  const gym = await validateGym(tenantId, gymId);
  const { planId, membershipStartDate, ...memberData } = data;

  let plan = null;
  if (planId) {
    plan = await PlanModel.findById(planId, gymId);
    if (!plan || !plan.isActive) {
      throw new BadRequestError('Selected membership plan is invalid or inactive');
    }
  }

  const count = await MemberModel.countByGym(gymId);
  const memberCode = `M${String(count + 1).padStart(5, '0')}`;

  const qrPayload = JSON.stringify({ gymId, memberCode, secret: gym.qrCodeSecret });
  const qrCode = await QRCode.toDataURL(qrPayload);

  const startDate = membershipStartDate ? new Date(membershipStartDate) : new Date();
  const membershipData = plan
    ? {
        gymId,
        planId: plan.id,
        status: 'ACTIVE',
        startDate,
        endDate: new Date(startDate.getTime() + plan.durationDays * 24 * 60 * 60 * 1000),
        amountPaid: plan.price,
      }
    : null;

  return MemberModel.create(
    {
      ...memberData,
      isActive: memberData.isActive !== false,
      gymId,
      memberCode,
      qrCode,
      dateOfBirth: memberData.dateOfBirth ? new Date(memberData.dateOfBirth) : null,
    },
    membershipData
  );
};

export const update = async (tenantId, gymId, memberId, data) => {
  await validateGym(tenantId, gymId);

  const existing = await MemberModel.findById(memberId, gymId);
  if (!existing) throw new NotFoundError('Member not found');

  return MemberModel.update(memberId, {
    ...data,
    dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
  });
};

export const remove = async (tenantId, gymId, memberId) => {
  await validateGym(tenantId, gymId);

  const existing = await MemberModel.findById(memberId, gymId);
  if (!existing) throw new NotFoundError('Member not found');

  await MemberModel.softDelete(memberId);
  return { message: 'Member deleted successfully' };
};
