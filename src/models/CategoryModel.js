import { ProductCategory } from '../schemas/index.js';
import { paginate, aggregateOne } from '../helpers/pagination.js';
import { createDoc, updateById, asDoc } from '../helpers/document.js';
import { PAGE, SORT } from '../helpers/constants.js';
import { textSearch } from '../helpers/query.js';
import { categoryPublic } from '../projections/store.projection.js';

export const findMany = async (gymId, { skip, limit, search } = {}) => {
  const { data, pagination } = await paginate(ProductCategory, {
    match: { gymId, deletedAt: null, ...textSearch(search, ['name']) },
    project: categoryPublic,
    sort: SORT.CREATED_DESC,
    page: Math.floor((skip || 0) / (limit || PAGE.DEFAULT)) + 1,
    limit: limit || PAGE.DEFAULT,
  });
  return [data, pagination.total];
};

export const findById = (id, gymId) =>
  aggregateOne(ProductCategory, { match: { _id: id, gymId, deletedAt: null }, project: categoryPublic });

export const create = (data) => createDoc(ProductCategory, data);
export const update = (id, data) => updateById(ProductCategory, id, data);
export const remove = async (id) => asDoc(await ProductCategory.findByIdAndDelete(id));
