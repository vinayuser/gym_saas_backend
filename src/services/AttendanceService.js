import * as AttendanceModel from '../models/AttendanceModel.js';
import * as GymModel from '../models/GymModel.js';
import * as MemberModel from '../models/MemberModel.js';
import { NotFoundError } from '../utils/errors.js';
import { parsePagination, buildPaginationMeta } from '../utils/response.js';

const validateGym = async (tenantId, gymId) => {
  const gym = await GymModel.findById(gymId, tenantId);
  if (!gym) throw new NotFoundError('Gym not found');
  return gym;
};

export const list = async (tenantId, gymId, query) => {
  await validateGym(tenantId, gymId);
  const pagination = parsePagination(query);
  const [records, total] = await AttendanceModel.findMany(gymId, {
    ...pagination,
    date: query.date,
  });
  const stats = await AttendanceModel.todayStats(gymId);
  const memberCount = await MemberModel.countByGym(gymId);

  return {
    records: records.map((r) => ({
      ...r,
      memberName: `${r.member.firstName} ${r.member.lastName}`.trim(),
      planName: r.member.memberships?.[0]?.plan?.name || '—',
    })),
    stats: {
      ...stats,
      capacity: 150,
      memberTotal: memberCount,
    },
    pagination: buildPaginationMeta(total, pagination.page, pagination.limit),
  };
};

export const checkIn = async (tenantId, gymId, body) => {
  await validateGym(tenantId, gymId);
  const member = await MemberModel.findById(body.memberId, gymId);
  if (!member) throw new NotFoundError('Member not found');
  return AttendanceModel.create({
    gymId,
    memberId: body.memberId,
    type: 'CHECK_IN',
    source: body.source || 'FRONTDESK',
  });
};
