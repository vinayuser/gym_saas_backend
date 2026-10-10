import { User } from '../schemas/index.js';
import { aggregateOne } from '../helpers/pagination.js';
import { createDoc, updateById, asDoc } from '../helpers/document.js';
import { lookupOne, notDeleted } from '../helpers/query.js';
import { COLLECTIONS } from '../helpers/constants.js';
import { userPublic, userAuth, userBrief } from '../projections/user.projection.js';
import { tenantPublic } from '../projections/tenant.projection.js';

const userLookups = [
  ...lookupOne(COLLECTIONS.TENANTS, 'tenantId', 'tenant', tenantPublic),
  {
    $lookup: {
      from: COLLECTIONS.USER_ROLE_ASSIGNMENTS,
      let: { uid: '$_id' },
      pipeline: [
        { $match: { $expr: { $eq: ['$userId', '$$uid'] } } },
        ...lookupOne(COLLECTIONS.ROLES, 'roleId', 'role'),
        ...lookupOne(COLLECTIONS.GYMS, 'gymId', 'gym', { _id: 0, id: '$_id', name: 1 }),
        { $project: { _id: 0, id: '$_id', userId: 1, roleId: 1, gymId: 1, role: 1, gym: 1 } },
      ],
      as: 'roleAssignments',
    },
  },
];

export const findByEmail = (email, tenantId = null) =>
  aggregateOne(User, {
    match: {
      email: email.toLowerCase(),
      ...(tenantId !== undefined ? { tenantId } : {}),
      ...notDeleted,
    },
    project: userAuth,
  });

export const findById = (id) =>
  aggregateOne(User, {
    match: { _id: id, ...notDeleted },
    lookups: userLookups,
    project: { ...userPublic, tenant: 1, roleAssignments: 1, password: 1, totpSecret: 1, twoFactorEnabled: 1 },
  });

export const create = (data) => createDoc(User, data);

export const update = (id, data) => updateById(User, id, data);

export const findActiveById = async (id) =>
  asDoc(
    await User.findOne({ _id: id, ...notDeleted }).select(
      'email firstName lastName role status tenantId emailVerified'
    )
  );
