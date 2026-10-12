import * as AttendanceModel from '../models/AttendanceModel.js';
import * as GymModel from '../models/GymModel.js';
import * as MemberModel from '../models/MemberModel.js';
import { BadRequestError, NotFoundError } from '../utils/errors.js';
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
    search: pagination.search || query.search || query.q,
  });
  const [stats, memberCount, trend] = await Promise.all([
    AttendanceModel.todayStats(gymId),
    MemberModel.countByGym(gymId),
    AttendanceModel.dailyTrend(gymId, 14),
  ]);

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
      predictedPeak: predictedPeakHour(stats.hourly),
    },
    trend,
    pagination: buildPaginationMeta(total, pagination.page, pagination.limit),
  };
};

const predictedPeakHour = (hourly = []) => {
  if (!hourly.length) return null;
  const peak = hourly.reduce((best, item) => (item.count > best.count ? item : best), hourly[0]);
  if (!peak.count) return null;
  return `${String(peak.hour).padStart(2, '0')}:00`;
};

const parseQrPayload = (raw) => {
  if (!raw) return null;
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const resolveMember = async (gym, body) => {
  if (body.memberId) {
    return MemberModel.findById(body.memberId, gym.id);
  }
  const payload = parseQrPayload(body.qrPayload);
  const code = body.memberCode || payload?.memberCode;
  if (payload?.gymId && payload.gymId !== gym.id) {
    throw new BadRequestError('QR belongs to a different gym');
  }
  if (payload?.secret && gym.qrCodeSecret && payload.secret !== gym.qrCodeSecret) {
    throw new BadRequestError('Invalid QR code');
  }
  if (code) return MemberModel.findByCode(gym.id, code);
  return null;
};

export const lookup = async (tenantId, gymId, query) => {
  await validateGym(tenantId, gymId);
  const search = String(query.q || query.search || '').trim();
  if (!search) return { members: [] };
  const [[members], openIds] = await Promise.all([
    MemberModel.findMany(gymId, {
      skip: 0,
      limit: 16,
      search,
      sortBy: 'firstName',
      sortOrder: 'asc',
    }),
    AttendanceModel.findOpenMemberIds(gymId),
  ]);
  return {
    members: members
      .filter((m) => !openIds.has(String(m.id)))
      .slice(0, 8)
      .map((m) => ({
        id: m.id,
        memberCode: m.memberCode,
        firstName: m.firstName,
        lastName: m.lastName,
        phone: m.phone,
        planName: m.memberships?.[0]?.plan?.name || '—',
        isActive: m.isActive,
      })),
  };
};

export const checkIn = async (tenantId, gymId, body) => {
  const gym = await validateGym(tenantId, gymId);
  const member = await resolveMember(gym, body);
  if (!member) throw new NotFoundError('Member not found');
  if (!member.isActive) throw new BadRequestError('Member is inactive');

  const open = await AttendanceModel.findOpenCheckIn(gymId, member.id);
  if (open) {
    const checkedOut = await AttendanceModel.update(open.id, {
      checkOutAt: new Date(),
      type: 'CHECK_OUT',
    });
    return {
      ...checkedOut,
      action: 'CHECK_OUT',
      memberName: `${member.firstName} ${member.lastName}`.trim(),
      memberCode: member.memberCode,
    };
  }

  const record = await AttendanceModel.create({
    gymId,
    memberId: member.id,
    type: 'CHECK_IN',
    source: body.source || (body.qrPayload ? 'QR_CODE' : 'FRONTDESK'),
  });
  return {
    ...record,
    action: 'CHECK_IN',
    memberName: `${member.firstName} ${member.lastName}`.trim(),
    memberCode: member.memberCode,
  };
};
