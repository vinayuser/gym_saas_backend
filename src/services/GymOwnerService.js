import { User } from '../schemas/index.js';
import { paginate } from '../helpers/pagination.js';
import { asDoc, updateById } from '../helpers/document.js';
import { lookupOne, notDeleted, textSearch } from '../helpers/query.js';
import { COLLECTIONS, SORT, ROLES } from '../helpers/constants.js';
import { parsePagination, buildPaginationMeta } from '../utils/response.js';
import { hashPassword } from '../utils/password.js';

const ownerLookups = [
  {
    $lookup: {
      from: COLLECTIONS.TENANTS,
      let: { uid: '$_id' },
      pipeline: [
        { $match: { $expr: { $eq: ['$ownerId', '$$uid'] }, deletedAt: null } },
        {
          $lookup: {
            from: COLLECTIONS.SUBSCRIPTIONS,
            let: { tid: '$_id' },
            pipeline: [
              { $match: { $expr: { $eq: ['$tenantId', '$$tid'] } } },
              ...lookupOne(COLLECTIONS.SUBSCRIPTION_PLANS, 'planId', 'plan', {
                _id: 0,
                id: '$_id',
                name: 1,
                type: 1,
              }),
              {
                $project: {
                  _id: 0,
                  id: '$_id',
                  status: 1,
                  currentPeriodEnd: 1,
                  plan: 1,
                },
              },
            ],
            as: 'subscription',
          },
        },
        { $unwind: { path: '$subscription', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: COLLECTIONS.GYMS,
            let: { tid: '$_id' },
            pipeline: [{ $match: { $expr: { $eq: ['$tenantId', '$$tid'] }, deletedAt: null } }, { $project: { _id: 1 } }],
            as: '_gyms',
          },
        },
        {
          $project: {
            _id: 0,
            id: '$_id',
            name: 1,
            slug: 1,
            isActive: 1,
            createdAt: 1,
            subscription: 1,
            gymCount: { $size: '$_gyms' },
          },
        },
      ],
      as: 'ownedTenant',
    },
  },
  { $unwind: { path: '$ownedTenant', preserveNullAndEmptyArrays: true } },
];

export const listGymOwners = async (query) => {
  const pagination = parsePagination(query);
  const search = query.search?.trim();

  const match = {
    role: ROLES.GYM_OWNER,
    ...notDeleted,
  };

  if (query.status === 'ACTIVE') match.status = 'ACTIVE';
  if (query.status === 'INACTIVE') match.status = { $in: ['INACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION'] };

  Object.assign(match, textSearch(search, ['email', 'firstName', 'lastName', 'phone']));

  const { data: owners, pagination: pageMeta } = await paginate(User, {
    match,
    lookups: ownerLookups,
    project: {
      _id: 0,
      id: '$_id',
      email: 1,
      firstName: 1,
      lastName: 1,
      phone: 1,
      status: 1,
      createdAt: 1,
      lastLoginAt: 1,
      ownedTenant: 1,
    },
    sort: SORT.CREATED_DESC,
    page: pagination.page,
    limit: pagination.limit,
  });

  return {
    owners: owners.map((o) => ({
      id: o.id,
      email: o.email,
      firstName: o.firstName,
      lastName: o.lastName,
      phone: o.phone,
      status: o.status,
      createdAt: o.createdAt,
      lastLoginAt: o.lastLoginAt,
      tenant: o.ownedTenant
        ? {
            id: o.ownedTenant.id,
            name: o.ownedTenant.name,
            slug: o.ownedTenant.slug,
            isActive: o.ownedTenant.isActive,
            gymCount: o.ownedTenant.gymCount,
            subscription: o.ownedTenant.subscription,
          }
        : null,
    })),
    pagination: buildPaginationMeta(pageMeta.total, pagination.page, pagination.limit),
  };
};

export const updateOwnerStatus = async (ownerId, status) => {
  const owner = asDoc(await User.findOne({ _id: ownerId, role: ROLES.GYM_OWNER, ...notDeleted }));
  if (!owner) return null;

  const updated = await updateById(User, ownerId, { status });
  return { id: updated.id, email: updated.email, status: updated.status };
};

export const resetOwnerPassword = async (ownerId, password) => {
  const owner = asDoc(await User.findOne({ _id: ownerId, role: ROLES.GYM_OWNER, ...notDeleted }));
  if (!owner) return null;

  const hashed = await hashPassword(password);
  await updateById(User, ownerId, { password: hashed });

  return { id: owner.id, email: owner.email };
};
