import { Attendance } from '../schemas/index.js';
import { paginate, aggregateOne } from '../helpers/pagination.js';
import { createDoc, updateById, asDoc } from '../helpers/document.js';
import { lookupOne, textSearch } from '../helpers/query.js';
import { COLLECTIONS, PAGE } from '../helpers/constants.js';
import { attendancePublic } from '../projections/ops.projection.js';
import { memberBrief } from '../projections/member.projection.js';

const dayRange = (date = new Date()) => {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  return { dayStart, dayEnd };
};

const memberLookup = lookupOne(COLLECTIONS.MEMBERS, 'memberId', 'member', {
  ...memberBrief,
  memberships: 1,
});

const membershipLookup = {
  $lookup: {
    from: COLLECTIONS.MEMBERSHIPS,
    let: { mid: '$memberId' },
    pipeline: [
      { $match: { $expr: { $eq: ['$memberId', '$$mid'] }, status: 'ACTIVE' } },
      { $limit: 1 },
      {
        $lookup: {
          from: COLLECTIONS.GYM_MEMBERSHIP_PLANS,
          localField: 'planId',
          foreignField: '_id',
          as: 'plan',
        },
      },
      { $unwind: { path: '$plan', preserveNullAndEmptyArrays: true } },
      { $project: { _id: 0, id: '$_id', status: 1, plan: { id: '$plan._id', name: '$plan.name' } } },
    ],
    as: 'member.memberships',
  },
};

export const findMany = async (gymId, { skip, limit, date, days = 30, search }) => {
  const where = { gymId };
  if (date) {
    const { dayStart, dayEnd } = dayRange(new Date(date));
    where.checkInAt = { $gte: dayStart, $lt: dayEnd };
  } else {
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    from.setDate(from.getDate() - (days - 1));
    where.checkInAt = { $gte: from };
  }

  const memberLookups = lookupOne(COLLECTIONS.MEMBERS, 'memberId', 'member', memberBrief);
  const searchValue = search?.trim();

  const { data, pagination } = await paginate(Attendance, {
    match: where,
    before: searchValue
      ? [
          ...memberLookups,
          {
            $match: textSearch(searchValue, [
              'member.firstName',
              'member.lastName',
              'member.email',
              'member.phone',
              'member.memberCode',
            ]),
          },
        ]
      : [],
    lookups: searchValue ? [membershipLookup] : [...memberLookups, membershipLookup],
    project: attendancePublic,
    sort: { checkInAt: -1 },
    page: Math.floor((skip || 0) / (limit || PAGE.DEFAULT)) + 1,
    limit: limit || PAGE.DEFAULT,
  });
  return [data, pagination.total];
};

export const todayStats = async (gymId) => {
  const { dayStart, dayEnd } = dayRange();
  const [out] = await Attendance.aggregate([
    { $match: { gymId, checkInAt: { $gte: dayStart, $lt: dayEnd } } },
    {
      $facet: {
        totalToday: [{ $count: 'n' }],
        currentlyInside: [{ $match: { type: 'CHECK_IN', checkOutAt: null } }, { $count: 'n' }],
        hourly: [
          { $group: { _id: { $hour: { date: '$checkInAt', timezone: 'Asia/Kolkata' } }, count: { $sum: 1 } } },
          { $project: { _id: 0, hour: '$_id', count: 1 } },
          { $match: { hour: { $gte: 6, $lte: 22 } } },
          { $sort: { hour: 1 } },
        ],
      },
    },
  ]);
  return {
    totalToday: out?.totalToday?.[0]?.n || 0,
    currentlyInside: out?.currentlyInside?.[0]?.n || 0,
    hourly: out?.hourly || [],
  };
};

export const dailyTrend = async (gymId, days = 14) => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));

  const rows = await Attendance.aggregate([
    { $match: { gymId, checkInAt: { $gte: start } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$checkInAt' } },
        count: { $sum: 1 },
      },
    },
  ]);
  const byDay = Object.fromEntries(rows.map((row) => [row._id, row.count]));
  return Array.from({ length: days }, (_, i) => {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    const key = day.toISOString().slice(0, 10);
    return {
      label: day.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
      count: byDay[key] || 0,
    };
  });
};

export const create = (data) => createDoc(Attendance, data);
export const update = (id, data) => updateById(Attendance, id, data);

export const findOpenCheckIn = async (gymId, memberId) => {
  const { dayStart } = dayRange();
  return asDoc(
    await Attendance.findOne({
      gymId,
      memberId,
      type: 'CHECK_IN',
      checkOutAt: null,
      checkInAt: { $gte: dayStart },
    }).sort({ checkInAt: -1 })
  );
};

export const findOpenMemberIds = async (gymId) => {
  const { dayStart } = dayRange();
  const rows = await Attendance.find({
    gymId,
    type: 'CHECK_IN',
    checkOutAt: null,
    checkInAt: { $gte: dayStart },
  }).select('memberId');
  return new Set(rows.map((row) => String(row.memberId)));
};
