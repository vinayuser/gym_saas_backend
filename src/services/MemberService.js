import QRCode from 'qrcode';
import * as MemberModel from '../models/MemberModel.js';
import * as GymModel from '../models/GymModel.js';
import * as PlanModel from '../models/MembershipPlanModel.js';
import { User } from '../schemas/index.js';
import { createDoc, updateById, asDoc } from '../helpers/document.js';
import { notDeleted } from '../helpers/query.js';
import { ROLES, USER_STATUS } from '../helpers/constants.js';
import { hashPassword } from '../utils/password.js';
import { NotFoundError, BadRequestError, ConflictError } from '../utils/errors.js';
import { assertGymCapacity } from './PlatformBillingService.js';
import { parsePagination, buildPaginationMeta } from '../utils/response.js';

const DEFAULT_PORTAL_PASSWORD = 'Member@123';

const generateQr = async (gym, memberCode) => {
  const qrPayload = JSON.stringify({ gymId: gym.id, memberCode, secret: gym.qrCodeSecret });
  return QRCode.toDataURL(qrPayload);
};

const ensurePortalUser = async ({ tenantId, email, firstName, lastName, phone, password, existingUserId }) => {
  if (!email) return { userId: existingUserId || null, portalCredentials: null };
  const normalized = email.toLowerCase().trim();
  const plain = password || DEFAULT_PORTAL_PASSWORD;

  if (existingUserId) {
    const data = { firstName, lastName, phone: phone || null };
    if (password) data.password = await hashPassword(password);
    await updateById(User, existingUserId, data);
    return {
      userId: existingUserId,
      portalCredentials: password ? { email: normalized, password: plain } : null,
    };
  }

  const existing = asDoc(await User.findOne({ email: normalized, tenantId, ...notDeleted }));
  if (existing) {
    if (existing.role !== ROLES.MEMBER) {
      throw new ConflictError('This email is already used by a staff account');
    }
    return { userId: existing.id, portalCredentials: null };
  }

  const user = await createDoc(User, {
    email: normalized,
    password: await hashPassword(plain),
    firstName,
    lastName: lastName || '',
    phone: phone || null,
    role: ROLES.MEMBER,
    status: USER_STATUS.ACTIVE,
    tenantId,
    emailVerified: true,
  });
  return { userId: user.id, portalCredentials: { email: normalized, password: plain } };
};

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
  await assertGymCapacity(tenantId, gymId, 'members');
  const { planId, membershipStartDate, portalPassword, ...memberData } = data;

  let plan = null;
  if (planId) {
    plan = await PlanModel.findById(planId, gymId);
    if (!plan || !plan.isActive) {
      throw new BadRequestError('Selected membership plan is invalid or inactive');
    }
  }

  const count = await MemberModel.countByGym(gymId);
  const memberCode = `M${String(count + 1).padStart(5, '0')}`;

  const qrCode = await generateQr(gym, memberCode);
  const { userId, portalCredentials } = await ensurePortalUser({
    tenantId,
    email: memberData.email,
    firstName: memberData.firstName,
    lastName: memberData.lastName,
    phone: memberData.phone,
    password: portalPassword,
  });

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

  const member = await MemberModel.create(
    {
      ...memberData,
      isActive: memberData.isActive !== false,
      gymId,
      userId,
      memberCode,
      qrCode,
      dateOfBirth: memberData.dateOfBirth ? new Date(memberData.dateOfBirth) : null,
    },
    membershipData
  );

  return { ...member, portalCredentials };
};

export const update = async (tenantId, gymId, memberId, data) => {
  await validateGym(tenantId, gymId);

  const existing = await MemberModel.findById(memberId, gymId);
  if (!existing) throw new NotFoundError('Member not found');

  const { portalPassword, ...rest } = data;
  if (rest.email || portalPassword) {
    const { userId } = await ensurePortalUser({
      tenantId,
      email: rest.email || existing.email,
      firstName: rest.firstName || existing.firstName,
      lastName: rest.lastName || existing.lastName,
      phone: rest.phone || existing.phone,
      password: portalPassword,
      existingUserId: existing.userId,
    });
    if (userId && !existing.userId) rest.userId = userId;
  }

  return MemberModel.update(memberId, {
    ...rest,
    dateOfBirth: rest.dateOfBirth ? new Date(rest.dateOfBirth) : undefined,
  });
};

export const regenerateQr = async (tenantId, gymId, memberId) => {
  const gym = await validateGym(tenantId, gymId);
  const existing = await MemberModel.findById(memberId, gymId);
  if (!existing) throw new NotFoundError('Member not found');
  const qrCode = await generateQr(gym, existing.memberCode);
  return MemberModel.update(memberId, { qrCode });
};

export const provisionPortal = async (tenantId, gymId, memberId, body = {}) => {
  const existing = await MemberModel.findById(memberId, gymId);
  if (!existing) throw new NotFoundError('Member not found');
  const email = body.email || existing.email;
  if (!email) throw new BadRequestError('Add an email before enabling portal access');
  const { userId, portalCredentials } = await ensurePortalUser({
    tenantId,
    email,
    firstName: existing.firstName,
    lastName: existing.lastName,
    phone: existing.phone,
    password: body.portalPassword || DEFAULT_PORTAL_PASSWORD,
    existingUserId: existing.userId,
  });
  if (userId && !existing.userId) {
    await MemberModel.update(memberId, { userId, ...(existing.email ? {} : { email }) });
  }
  return {
    memberId,
    hasPortal: Boolean(userId),
    portalCredentials: portalCredentials || { email, password: body.portalPassword || DEFAULT_PORTAL_PASSWORD },
  };
};

export const remove = async (tenantId, gymId, memberId) => {
  await validateGym(tenantId, gymId);

  const existing = await MemberModel.findById(memberId, gymId);
  if (!existing) throw new NotFoundError('Member not found');

  await MemberModel.softDelete(memberId);
  return { message: 'Member deleted successfully' };
};
