import prisma from '../config/database.js';
import * as StaffModel from '../models/StaffModel.js';
import * as GymModel from '../models/GymModel.js';
import * as UserModel from '../models/UserModel.js';
import { hashPassword } from '../utils/password.js';
import { NotFoundError, ConflictError, BadRequestError } from '../utils/errors.js';
import { parsePagination, buildPaginationMeta } from '../utils/response.js';

const ROLE_MAP = {
  trainer: 'TRAINER',
  'front-desk': 'RECEPTIONIST',
  manager: 'MANAGER',
  nutritionist: 'TRAINER',
};

const DESIGNATION_MAP = {
  trainer: 'Trainer',
  'front-desk': 'Front Desk',
  manager: 'Manager',
  nutritionist: 'Nutritionist',
};

const FILTER_ROLE_MAP = {
  trainers: 'TRAINER',
  'front-desk': 'RECEPTIONIST',
  management: 'MANAGER',
};

const validateGym = async (tenantId, gymId) => {
  const gym = await GymModel.findById(gymId, tenantId);
  if (!gym) throw new NotFoundError('Gym not found');
  return gym;
};

const splitName = (fullName) => {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
};

const resolveUserRole = (staffRole, adminDashboardAccess) => {
  if (adminDashboardAccess) return 'MANAGER';
  return ROLE_MAP[staffRole] || 'RECEPTIONIST';
};

const buildStaffEmploymentData = (body) => ({
  employmentType: body.employmentType || null,
  baseSalary: body.baseSalary ?? body.baseRate ?? null,
  salaryCurrency: body.salaryCurrency || 'INR',
  paymentFrequency: body.paymentFrequency || null,
  address: body.address || null,
  city: body.city || null,
  state: body.state || null,
  pincode: body.pincode || null,
  addressProofUrl: body.addressProofUrl || null,
  idProofUrl: body.idProofUrl || null,
});

export const list = async (tenantId, gymId, query) => {
  await validateGym(tenantId, gymId);

  const pagination = parsePagination(query);
  let roleFilter;
  if (query.category && FILTER_ROLE_MAP[query.category]) {
    roleFilter = FILTER_ROLE_MAP[query.category];
  }

  const isActive =
    query.isActive === 'false' ? false : query.isActive === 'true' ? true : undefined;

  const [staff, total] = await StaffModel.findMany(gymId, {
    ...pagination,
    search: pagination.search,
    role: roleFilter,
    isActive,
  });

  const trainerUserIds = staff
    .filter((s) => s.user.role === 'TRAINER')
    .map((s) => s.userId);

  const trainers =
    trainerUserIds.length > 0
      ? await prisma.trainer.findMany({
          where: { gymId, userId: { in: trainerUserIds } },
          select: { userId: true, bio: true, specialties: true },
        })
      : [];

  const trainerByUser = Object.fromEntries(trainers.map((t) => [t.userId, t]));

  const enriched = staff.map((row) => ({
    ...row,
    trainer: trainerByUser[row.userId] || null,
  }));

  return {
    staff: enriched,
    pagination: buildPaginationMeta(total, pagination.page, pagination.limit),
  };
};

export const getById = async (tenantId, gymId, staffId) => {
  await validateGym(tenantId, gymId);
  const staff = await StaffModel.findById(staffId, gymId);
  if (!staff) throw new NotFoundError('Staff member not found');

  let trainer = null;
  if (staff.user.role === 'TRAINER') {
    trainer = await prisma.trainer.findFirst({
      where: { gymId, userId: staff.userId },
    });
  }

  return { ...staff, trainer };
};

export const create = async (tenantId, gymId, body) => {
  await validateGym(tenantId, gymId);

  const { firstName, lastName } = body.firstName
    ? { firstName: body.firstName, lastName: body.lastName || '' }
    : splitName(body.fullName || '');

  if (!firstName) throw new BadRequestError('Full name is required');

  const email = body.email.toLowerCase();
  const existing = await UserModel.findByEmail(email, tenantId);
  if (existing) throw new ConflictError('Email already registered');

  const userRole = resolveUserRole(body.staffRole, body.adminDashboardAccess);
  const designation =
    body.designation || DESIGNATION_MAP[body.staffRole] || 'Staff';
  const hashedPassword = await hashPassword(body.password || 'Staff@123');

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        tenantId,
        email,
        password: hashedPassword,
        firstName,
        lastName,
        phone: body.phone || null,
        avatar: body.avatar || null,
        role: userRole,
        status: 'ACTIVE',
        emailVerified: true,
      },
    });

    const gymStaff = await tx.gymStaff.create({
      data: {
        gymId,
        userId: user.id,
        designation,
        joinedAt: body.joinedAt ? new Date(body.joinedAt) : new Date(),
        isActive: true,
        ...buildStaffEmploymentData(body),
      },
    });

    let trainer = null;
    if (userRole === 'TRAINER') {
      trainer = await tx.trainer.create({
        data: {
          gymId,
          userId: user.id,
          bio: body.bio || null,
          specialties: body.specializations || [],
        },
      });
    }

    return { gymStaff, user, trainer };
  });

  return {
    ...result.gymStaff,
    user: {
      id: result.user.id,
      firstName: result.user.firstName,
      lastName: result.user.lastName,
      email: result.user.email,
      phone: result.user.phone,
      role: result.user.role,
      avatar: result.user.avatar,
      status: result.user.status,
    },
    trainer: result.trainer,
  };
};

export const update = async (tenantId, gymId, staffId, body) => {
  await validateGym(tenantId, gymId);
  const staff = await StaffModel.findById(staffId, gymId);
  if (!staff) throw new NotFoundError('Staff member not found');

  const userUpdates = {};
  if (body.firstName !== undefined) userUpdates.firstName = body.firstName;
  if (body.lastName !== undefined) userUpdates.lastName = body.lastName;
  if (body.fullName) {
    const parsed = splitName(body.fullName);
    userUpdates.firstName = parsed.firstName;
    userUpdates.lastName = parsed.lastName;
  }
  if (body.email) userUpdates.email = body.email.toLowerCase();
  if (body.phone !== undefined) userUpdates.phone = body.phone;
  if (body.avatar !== undefined) userUpdates.avatar = body.avatar;
  if (body.staffRole || body.adminDashboardAccess !== undefined) {
    userUpdates.role = resolveUserRole(
      body.staffRole || 'trainer',
      body.adminDashboardAccess
    );
  }

  const staffUpdates = {};
  if (body.designation !== undefined) staffUpdates.designation = body.designation;
  if (body.joinedAt) staffUpdates.joinedAt = new Date(body.joinedAt);
  if (body.isActive !== undefined) staffUpdates.isActive = body.isActive;

  const employmentKeys = [
    'employmentType',
    'baseRate',
    'baseSalary',
    'salaryCurrency',
    'paymentFrequency',
    'address',
    'city',
    'state',
    'pincode',
    'addressProofUrl',
    'idProofUrl',
  ];
  if (employmentKeys.some((key) => body[key] !== undefined)) {
    Object.assign(staffUpdates, buildStaffEmploymentData(body));
  }

  await prisma.$transaction(async (tx) => {
    if (Object.keys(userUpdates).length) {
      await tx.user.update({ where: { id: staff.userId }, data: userUpdates });
    }
    if (Object.keys(staffUpdates).length) {
      await tx.gymStaff.update({ where: { id: staffId }, data: staffUpdates });
    }

    const role = userUpdates.role || staff.user.role;
    if (role === 'TRAINER' || staff.user.role === 'TRAINER') {
      const existing = await tx.trainer.findFirst({
        where: { gymId, userId: staff.userId },
      });
      if (existing) {
        await tx.trainer.update({
          where: { id: existing.id },
          data: {
            ...(body.bio !== undefined ? { bio: body.bio } : {}),
            ...(body.specializations !== undefined
              ? { specialties: body.specializations }
              : {}),
          },
        });
      } else if (role === 'TRAINER') {
        await tx.trainer.create({
          data: {
            gymId,
            userId: staff.userId,
            bio: body.bio || null,
            specialties: body.specializations || [],
          },
        });
      }
    }
  });

  return getById(tenantId, gymId, staffId);
};

export const remove = async (tenantId, gymId, staffId) => {
  await validateGym(tenantId, gymId);
  const staff = await StaffModel.findById(staffId, gymId);
  if (!staff) throw new NotFoundError('Staff member not found');

  await StaffModel.remove(staffId);
  await UserModel.update(staff.userId, { status: 'INACTIVE' });

  return { message: 'Staff member deactivated' };
};
