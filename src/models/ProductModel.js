import { Product, Sale } from '../schemas/index.js';
import { paginate, aggregateOne, sumField } from '../helpers/pagination.js';
import { createDoc, updateById, softDeleteById } from '../helpers/document.js';
import { lookupOne, notDeleted, textSearch } from '../helpers/query.js';
import { COLLECTIONS, PAGE, SORT } from '../helpers/constants.js';
import { productPublic, categoryPublic } from '../projections/store.projection.js';

export const findMany = async (gymId, { skip, limit, search, categoryId, lowStock }) => {
  const { data, pagination } = await paginate(Product, {
    match: {
      gymId,
      ...notDeleted,
      ...(categoryId ? { categoryId } : {}),
      ...(lowStock ? { stockQty: { $lte: 5 } } : {}),
      ...textSearch(search, ['name', 'sku']),
    },
    lookups: lookupOne(COLLECTIONS.PRODUCT_CATEGORIES, 'categoryId', 'category', categoryPublic),
    project: productPublic,
    sort: SORT.NAME_ASC,
    page: Math.floor((skip || 0) / (limit || PAGE.DEFAULT)) + 1,
    limit: limit || PAGE.DEFAULT,
  });
  return [data, pagination.total];
};

export const findById = (id, gymId) =>
  aggregateOne(Product, {
    match: { _id: id, gymId, ...notDeleted },
    lookups: lookupOne(COLLECTIONS.PRODUCT_CATEGORIES, 'categoryId', 'category', categoryPublic),
    project: productPublic,
  });

export const create = (data) => createDoc(Product, data);
export const update = (id, data) => updateById(Product, id, data);
export const softDelete = (id) => softDeleteById(Product, id, { isActive: false });

export const stats = async (gymId) => {
  const [low] = await Product.aggregate([
    { $match: { gymId, ...notDeleted, isActive: true } },
    { $match: { $expr: { $lte: ['$stockQty', { $ifNull: ['$lowStockAt', 5] }] } } },
    { $count: 'n' },
  ]);
  const sales = await sumField(Sale, { match: { gymId }, field: 'totalAmount' });
  return { lowStock: low?.n || 0, totalRevenue: sales.total, salesCount: sales.count };
};
