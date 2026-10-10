import { GymMembershipPlan, Membership } from '../schemas/index.js';
import { paginate, aggregateOne } from '../helpers/pagination.js';
import { createDoc, updateById, softDeleteById } from '../helpers/document.js';
import { lookupMany, notDeleted, textSearch } from '../helpers/query.js';
import { COLLECTIONS, PAGE, SORT } from '../helpers/constants.js';
import { membershipPlanPublic } from '../projections/member.projection.js';

export const findMany = async (gymId, { skip, limit, search, isActive }) => {
  const { data, pagination } = await paginate(GymMembershipPlan, {
    match: {
      gymId,
      ...notDeleted,
      ...(isActive !== undefined ? { isActive } : {}),
      ...textSearch(search, ['name']),
    },
    lookups: [
      lookupMany(COLLECTIONS.MEMBERSHIPS, '_id', 'planId', '_memberships', [{ $project: { _id: 1 } }]),
      { $addFields: { _count: { memberships: { $size: '$_memberships' } } } },
    ],
    project: membershipPlanPublic,
    sort: SORT.CREATED_DESC,
    page: Math.floor((skip || 0) / (limit || PAGE.DEFAULT)) + 1,
    limit: limit || PAGE.DEFAULT,
  });
  return [data, pagination.total];
};

export const findById = (id, gymId) =>
  aggregateOne(GymMembershipPlan, { match: { _id: id, gymId, ...notDeleted }, project: membershipPlanPublic });

export const create = (data) => createDoc(GymMembershipPlan, data);
export const update = (id, data) => updateById(GymMembershipPlan, id, data);
export const softDelete = (id) => softDeleteById(GymMembershipPlan, id, { isActive: false });
