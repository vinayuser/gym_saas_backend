import { Member, Membership } from '../schemas/index.js';
import { paginate, aggregateOne, countDocuments } from '../helpers/pagination.js';
import { createDoc, updateById, softDeleteById } from '../helpers/document.js';
import { lookupMany, notDeleted, textSearch } from '../helpers/query.js';
import { COLLECTIONS, MEMBERSHIP_STATUS, SORT } from '../helpers/constants.js';
import { memberList, memberDetail, planBrief } from '../projections/member.projection.js';

const activeMembershipLookup = lookupMany(COLLECTIONS.MEMBERSHIPS, '_id', 'memberId', 'memberships', [
  { $match: { status: MEMBERSHIP_STATUS.ACTIVE } },
  { $sort: SORT.CREATED_DESC },
  { $limit: 1 },
  {
    $lookup: {
      from: COLLECTIONS.GYM_MEMBERSHIP_PLANS,
      let: { pid: '$planId' },
      pipeline: [
        { $match: { $expr: { $eq: ['$_id', '$$pid'] } } },
        { $project: planBrief },
      ],
      as: 'plan',
    },
  },
  { $unwind: { path: '$plan', preserveNullAndEmptyArrays: true } },
  {
    $project: {
      _id: 0,
      id: '$_id',
      gymId: 1,
      memberId: 1,
      planId: 1,
      status: 1,
      startDate: 1,
      endDate: 1,
      amountPaid: 1,
      plan: 1,
      createdAt: 1,
    },
  },
]);

export const findMany = async (gymId, { skip, limit, search, sortBy, sortOrder, isActive }) => {
  const { data, pagination } = await paginate(Member, {
    match: {
      gymId,
      ...notDeleted,
      ...(isActive !== undefined ? { isActive } : {}),
      ...textSearch(search, ['firstName', 'lastName', 'email', 'phone', 'memberCode']),
    },
    lookups: [activeMembershipLookup],
    project: memberList,
    sort: { [sortBy || 'createdAt']: sortOrder === 'asc' ? 1 : -1 },
    page: Math.floor((skip || 0) / (limit || 10)) + 1,
    limit,
  });
  return [data, pagination.total];
};

export const findByCode = (gymId, memberCode) =>
  aggregateOne(Member, {
    match: { gymId, memberCode, ...notDeleted },
    lookups: [activeMembershipLookup],
    project: memberList,
  });

export const findById = (id, gymId) =>
  aggregateOne(Member, {
    match: { _id: id, gymId, ...notDeleted },
    lookups: [
      lookupMany(COLLECTIONS.MEMBERSHIPS, '_id', 'memberId', 'memberships', [
        { $sort: SORT.CREATED_DESC },
        {
          $lookup: {
            from: COLLECTIONS.GYM_MEMBERSHIP_PLANS,
            localField: 'planId',
            foreignField: '_id',
            as: 'plan',
          },
        },
        { $unwind: { path: '$plan', preserveNullAndEmptyArrays: true } },
        {
          $addFields: {
            id: '$_id',
            'plan.id': '$plan._id',
          },
        },
      ]),
      lookupMany(COLLECTIONS.BODY_MEASUREMENTS, '_id', 'memberId', 'measurements', [
        { $sort: { measuredAt: -1 } },
        { $limit: 10 },
        { $addFields: { id: '$_id' } },
        { $project: { _id: 0 } },
      ]),
      lookupMany(COLLECTIONS.WORKOUT_PLANS, '_id', 'memberId', 'workoutPlans', [
        { $match: { isActive: true } },
        { $limit: 5 },
        { $addFields: { id: '$_id' } },
        { $project: { _id: 0 } },
      ]),
      lookupMany(COLLECTIONS.DIET_PLANS, '_id', 'memberId', 'dietPlans', [
        { $match: { isActive: true } },
        { $limit: 5 },
        { $addFields: { id: '$_id' } },
        { $project: { _id: 0 } },
      ]),
    ],
    project: memberDetail,
  });

export const create = async (memberData, membershipData = null) => {
  const member = await createDoc(Member, memberData);
  if (membershipData) {
    await createDoc(Membership, { ...membershipData, memberId: member.id, gymId: member.gymId });
  }
  return findById(member.id, member.gymId);
};

export const update = (id, data) => updateById(Member, id, data);

export const softDelete = (id) => softDeleteById(Member, id, { isActive: false });

export const countByGym = (gymId) => countDocuments(Member, { gymId, ...notDeleted });
