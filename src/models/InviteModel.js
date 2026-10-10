import { GymInvite } from '../schemas/index.js';
import { paginate, aggregateOne } from '../helpers/pagination.js';
import { createDoc, updateById } from '../helpers/document.js';
import { lookupOne, textSearch } from '../helpers/query.js';
import { COLLECTIONS, PAGE, SORT } from '../helpers/constants.js';
import { invitePublic } from '../projections/invite.projection.js';
import { planPublic, tenantBrief, subscriptionBrief } from '../projections/tenant.projection.js';
import { gymBrief } from '../projections/gym.projection.js';
import { userBrief } from '../projections/user.projection.js';

const inviteLookups = [
  ...lookupOne(COLLECTIONS.SUBSCRIPTION_PLANS, 'planId', 'plan', planPublic),
  {
    $lookup: {
      from: COLLECTIONS.TENANTS,
      let: { tid: { $ifNull: ['$tenantId', '$existingTenantId'] } },
      pipeline: [
        { $match: { $expr: { $eq: ['$_id', '$$tid'] } } },
        ...lookupOne(COLLECTIONS.USERS, 'ownerId', 'owner', userBrief),
        {
          $lookup: {
            from: COLLECTIONS.SUBSCRIPTIONS,
            let: { tenantId: '$_id' },
            pipeline: [
              { $match: { $expr: { $eq: ['$tenantId', '$$tenantId'] } } },
              ...lookupOne(COLLECTIONS.SUBSCRIPTION_PLANS, 'planId', 'plan', { _id: 0, id: '$_id', name: 1 }),
              { $project: { ...subscriptionBrief, plan: 1 } },
            ],
            as: 'subscription',
          },
        },
        { $unwind: { path: '$subscription', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: COLLECTIONS.GYMS,
            let: { tenantId: '$_id' },
            pipeline: [
              { $match: { $expr: { $eq: ['$tenantId', '$$tenantId'] }, deletedAt: null } },
              { $sort: { createdAt: 1 } },
              { $project: gymBrief },
            ],
            as: 'gyms',
          },
        },
        { $project: { ...tenantBrief, owner: 1, subscription: 1, gyms: 1 } },
      ],
      as: 'tenant',
    },
  },
  { $unwind: { path: '$tenant', preserveNullAndEmptyArrays: true } },
];

const searchMatch = (search) => {
  const value = search?.trim();
  if (!value) return {};
  return {
    $or: [
      { email: { $regex: value, $options: 'i' } },
      { businessName: { $regex: value, $options: 'i' } },
      { inviteeName: { $regex: value, $options: 'i' } },
      { 'tenant.name': { $regex: value, $options: 'i' } },
      { 'tenant.email': { $regex: value, $options: 'i' } },
      { 'tenant.owner.email': { $regex: value, $options: 'i' } },
      { 'tenant.owner.firstName': { $regex: value, $options: 'i' } },
      { 'tenant.owner.lastName': { $regex: value, $options: 'i' } },
    ],
  };
};

export const findMany = async ({ status, search, skip, take }) => {
  const { data, pagination } = await paginate(GymInvite, {
    match: { ...(status ? { status } : {}) },
    before: search ? [...inviteLookups, { $match: searchMatch(search) }] : [],
    lookups: search ? [] : inviteLookups,
    project: invitePublic,
    sort: SORT.CREATED_DESC,
    page: Math.floor((skip || 0) / (take || PAGE.DEFAULT)) + 1,
    limit: take || PAGE.DEFAULT,
  });
  return { items: data, total: pagination.total };
};

export const findByToken = (token) =>
  aggregateOne(GymInvite, { match: { token }, lookups: inviteLookups, project: invitePublic });

export const findById = (id) =>
  aggregateOne(GymInvite, { match: { _id: id }, lookups: inviteLookups, project: invitePublic });

export const create = async (data) => {
  const doc = await createDoc(GymInvite, data);
  return findById(doc.id);
};

export const update = async (id, data) => {
  await updateById(GymInvite, id, data);
  return findById(id);
};

export const findByOrderId = (razorpayOrderId) =>
  aggregateOne(GymInvite, { match: { razorpayOrderId }, lookups: inviteLookups, project: invitePublic });
