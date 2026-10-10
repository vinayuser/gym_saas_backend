import { GymStaff } from '../schemas/index.js';
import { paginate, aggregateOne } from '../helpers/pagination.js';
import { createDoc, updateById, asDoc } from '../helpers/document.js';
import { lookupOne } from '../helpers/query.js';
import { COLLECTIONS, PAGE, SORT } from '../helpers/constants.js';
import { staffPublic } from '../projections/gym.projection.js';
import { userBrief } from '../projections/user.projection.js';

const staffLookups = lookupOne(COLLECTIONS.USERS, 'userId', 'user', userBrief);

const userSearch = (search) => {
  if (!search) return {};
  return {
    $or: ['user.firstName', 'user.lastName', 'user.email', 'user.phone'].map((field) => ({
      [field]: { $regex: search, $options: 'i' },
    })),
  };
};

export const findMany = async (gymId, { skip, limit, search, role, isActive }) => {
  const { data, pagination } = await paginate(GymStaff, {
    match: { gymId, ...(isActive !== undefined ? { isActive } : {}) },
    before: [
      ...lookupOne(COLLECTIONS.USERS, 'userId', 'user', userBrief),
      {
        $match: {
          'user.deletedAt': null,
          ...(role ? { 'user.role': role } : {}),
          ...userSearch(search),
        },
      },
    ],
    project: staffPublic,
    sort: SORT.CREATED_DESC,
    page: Math.floor((skip || 0) / (limit || PAGE.DEFAULT)) + 1,
    limit: limit || PAGE.DEFAULT,
  });
  return [data, pagination.total];
};

export const findById = (id, gymId) =>
  aggregateOne(GymStaff, {
    match: { _id: id, gymId },
    lookups: staffLookups,
    project: staffPublic,
  });

export const findByUserId = async (gymId, userId) => asDoc(await GymStaff.findOne({ gymId, userId }));

export const create = (data) => createDoc(GymStaff, data);

export const update = (id, data) => updateById(GymStaff, id, data);

export const remove = (id) => updateById(GymStaff, id, { isActive: false });
