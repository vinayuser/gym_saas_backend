import { GymMediaAd } from '../schemas/index.js';
import { paginate, aggregateOne } from '../helpers/pagination.js';
import { createDoc, updateById, softDeleteById } from '../helpers/document.js';
import { notDeleted, textSearch } from '../helpers/query.js';
import { PAGE } from '../helpers/constants.js';
import { mediaAdPublic } from '../projections/ops.projection.js';

export const findMany = async (gymId, { skip, limit, type, search, isActive }) => {
  const { data, pagination } = await paginate(GymMediaAd, {
    match: {
      gymId,
      ...notDeleted,
      ...(type ? { type } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
      ...textSearch(search, ['title']),
    },
    project: mediaAdPublic,
    sort: { sortOrder: 1, createdAt: -1 },
    page: Math.floor((skip || 0) / (limit || PAGE.DEFAULT)) + 1,
    limit: limit || PAGE.DEFAULT,
  });
  return [data, pagination.total];
};

export const findById = (id, gymId) =>
  aggregateOne(GymMediaAd, { match: { _id: id, gymId, ...notDeleted }, project: mediaAdPublic });

export const create = (data) => createDoc(GymMediaAd, data);
export const update = (id, data) => updateById(GymMediaAd, id, data);
export const softDelete = (id) => softDeleteById(GymMediaAd, id, { isActive: false });
