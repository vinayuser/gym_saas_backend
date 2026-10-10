import { Tenant, Subscription, Gym } from '../schemas/index.js';
import { aggregateOne, countDocuments } from '../helpers/pagination.js';
import { createDoc, updateById } from '../helpers/document.js';
import { lookupOne, lookupMany, notDeleted } from '../helpers/query.js';
import { COLLECTIONS } from '../helpers/constants.js';
import { tenantPublic } from '../projections/tenant.projection.js';
import { planPublic, subscriptionBrief, saasPaymentPublic } from '../projections/tenant.projection.js';
import { userBrief } from '../projections/user.projection.js';

const tenantLookups = [
  {
    $lookup: {
      from: COLLECTIONS.SUBSCRIPTIONS,
      let: { tid: '$_id' },
      pipeline: [
        { $match: { $expr: { $eq: ['$tenantId', '$$tid'] } } },
        { $project: { ...subscriptionBrief, planId: 1 } },
      ],
      as: 'subscription',
    },
  },
  { $unwind: { path: '$subscription', preserveNullAndEmptyArrays: true } },
  {
    $lookup: {
      from: COLLECTIONS.SUBSCRIPTION_PLANS,
      let: { planId: '$subscription.planId' },
      pipeline: [
        { $match: { $expr: { $eq: ['$_id', '$$planId'] } } },
        { $project: planPublic },
      ],
      as: '_plan',
    },
  },
  { $unwind: { path: '$_plan', preserveNullAndEmptyArrays: true } },
  {
    $lookup: {
      from: COLLECTIONS.SAAS_PAYMENTS,
      let: { sid: '$subscription.id' },
      pipeline: [
        { $match: { $expr: { $eq: ['$subscriptionId', '$$sid'] } } },
        { $sort: { createdAt: -1 } },
        { $limit: 5 },
        { $project: saasPaymentPublic },
      ],
      as: '_payments',
    },
  },
  ...lookupOne(COLLECTIONS.USERS, 'ownerId', 'owner', userBrief),
  lookupMany(COLLECTIONS.GYMS, '_id', 'tenantId', '_gyms', [{ $match: notDeleted }, { $project: { _id: 1 } }]),
  lookupMany(COLLECTIONS.USERS, '_id', 'tenantId', '_users', [{ $match: notDeleted }, { $project: { _id: 1 } }]),
  {
    $addFields: {
      'subscription.plan': '$_plan',
      'subscription.payments': '$_payments',
      _count: { gyms: { $size: '$_gyms' }, users: { $size: '$_users' } },
    },
  },
];

export const findById = (id) =>
  aggregateOne(Tenant, {
    match: { _id: id, ...notDeleted },
    lookups: tenantLookups,
    project: { ...tenantPublic, subscription: 1, owner: 1, _count: 1 },
  });

export const findBySlug = (slug) =>
  aggregateOne(Tenant, { match: { slug, ...notDeleted }, project: tenantPublic });

export const create = (data) => createDoc(Tenant, data);

export const update = (id, data) => updateById(Tenant, id, data);

export const countGyms = (tenantId) => countDocuments(Gym, { tenantId, ...notDeleted });
