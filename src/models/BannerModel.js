import { Banner } from '../schemas/index.js';
import { paginate, aggregateOne, countDocuments } from '../helpers/pagination.js';
import { createDoc, updateById, softDeleteById } from '../helpers/document.js';
import { notDeleted, textSearch } from '../helpers/query.js';
import { PAGE } from '../helpers/constants.js';
import { bannerPublic } from '../projections/ops.projection.js';

export const findMany = async (gymId, { skip, limit, search, status, isActive }) => {
  const { data, pagination } = await paginate(Banner, {
    match: {
      gymId,
      ...notDeleted,
      ...(status ? { status } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
      ...textSearch(search, ['name', 'internalCode']),
    },
    project: bannerPublic,
    sort: { sortOrder: 1, createdAt: -1 },
    page: Math.floor((skip || 0) / (limit || PAGE.DEFAULT)) + 1,
    limit: limit || PAGE.DEFAULT,
  });
  return [data, pagination.total];
};

export const findById = (id, gymId) =>
  aggregateOne(Banner, { match: { _id: id, gymId, ...notDeleted }, project: bannerPublic });

export const create = (data) => createDoc(Banner, data);
export const update = (id, data) => updateById(Banner, id, data);
export const softDelete = (id) => softDeleteById(Banner, id, { isActive: false });
export const countByGym = (gymId, status) =>
  countDocuments(Banner, { gymId, ...notDeleted, ...(status ? { status } : {}) });
