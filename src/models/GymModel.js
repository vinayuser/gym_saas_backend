import { Gym, Member, GymStaff, Trainer, GymMembershipPlan, GymBranch } from '../schemas/index.js';
import { paginate, aggregateOne, countDocuments } from '../helpers/pagination.js';
import { createDoc, updateById, softDeleteById } from '../helpers/document.js';
import { lookupMany, notDeleted, textSearch } from '../helpers/query.js';
import { COLLECTIONS, SORT } from '../helpers/constants.js';
import { gymPublic, gymBranchPublic } from '../projections/gym.projection.js';

const countLookups = [
  lookupMany(COLLECTIONS.MEMBERS, '_id', 'gymId', '_memberIds', [{ $match: notDeleted }, { $project: { _id: 1 } }]),
  lookupMany(COLLECTIONS.GYM_STAFF, '_id', 'gymId', '_staffIds', [{ $project: { _id: 1 } }]),
  lookupMany(COLLECTIONS.TRAINERS, '_id', 'gymId', '_trainerIds', [{ $project: { _id: 1 } }]),
  lookupMany(COLLECTIONS.GYM_MEMBERSHIP_PLANS, '_id', 'gymId', '_planIds', [
    { $match: notDeleted },
    { $project: { _id: 1 } },
  ]),
  lookupMany(COLLECTIONS.GYM_BRANCHES, '_id', 'gymId', 'branches', [{ $project: gymBranchPublic }]),
  {
    $addFields: {
      _count: {
        members: { $size: '$_memberIds' },
        staff: { $size: '$_staffIds' },
        trainers: { $size: '$_trainerIds' },
        membershipPlans: { $size: '$_planIds' },
      },
    },
  },
];

export const findMany = async (tenantId, { skip, limit, search, sortBy, sortOrder }) => {
  const { data, pagination } = await paginate(Gym, {
    match: { tenantId, ...notDeleted, ...textSearch(search, ['name', 'city', 'email']) },
    lookups: countLookups,
    project: { ...gymPublic, _count: 1 },
    sort: { [sortBy || 'createdAt']: sortOrder === 'asc' ? 1 : -1 },
    page: Math.floor((skip || 0) / (limit || 10)) + 1,
    limit,
  });
  return [data, pagination.total];
};

export const findById = (id, tenantId) =>
  aggregateOne(Gym, {
    match: { _id: id, ...(tenantId ? { tenantId } : {}), ...notDeleted },
    lookups: countLookups,
    project: { ...gymPublic, branches: 1, _count: 1 },
  });

export const findBySlug = (tenantId, slug) =>
  aggregateOne(Gym, { match: { tenantId, slug, ...notDeleted }, project: gymPublic });

export const create = (data) => createDoc(Gym, data);

export const update = (id, data) => updateById(Gym, id, data);

export const softDelete = (id) => softDeleteById(Gym, id, { isActive: false });

export const countByTenant = (tenantId) => countDocuments(Gym, { tenantId, ...notDeleted });
