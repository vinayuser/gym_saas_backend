import { Sale, SaleItem, Product } from '../schemas/index.js';
import { paginate, aggregateOne, groupCount, sumField } from '../helpers/pagination.js';
import { createDoc, updateById } from '../helpers/document.js';
import { lookupOne, lookupMany, textSearch } from '../helpers/query.js';
import { COLLECTIONS, PAGE, SORT, STORE_ORDER_STATUS } from '../helpers/constants.js';
import { salePublic, productBrief } from '../projections/store.projection.js';
import { memberBrief } from '../projections/member.projection.js';

const orderLookups = [
  ...lookupOne(COLLECTIONS.MEMBERS, 'memberId', 'member', memberBrief),
  lookupMany(COLLECTIONS.SALE_ITEMS, '_id', 'saleId', 'items', [
    {
      $lookup: {
        from: COLLECTIONS.PRODUCTS,
        let: { pid: '$productId' },
        pipeline: [
          { $match: { $expr: { $eq: ['$_id', '$$pid'] } } },
          { $project: productBrief },
        ],
        as: 'product',
      },
    },
    { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 0,
        id: '$_id',
        saleId: 1,
        productId: 1,
        quantity: 1,
        unitPrice: 1,
        total: 1,
        product: 1,
      },
    },
  ]),
];

const list = async (match, skip, limit, sort = { soldAt: -1 }) => {
  const { data, pagination } = await paginate(Sale, {
    match,
    lookups: orderLookups,
    project: salePublic,
    sort,
    page: Math.floor((skip || 0) / (limit || PAGE.DEFAULT)) + 1,
    limit: limit || PAGE.DEFAULT,
  });
  return [data, pagination.total];
};

export const findMany = (gymId, { skip, limit, fulfillmentStatus, memberId, search }) =>
  list(
    {
      gymId,
      ...(fulfillmentStatus ? { fulfillmentStatus } : {}),
      ...(memberId ? { memberId } : {}),
      ...textSearch(search, ['orderNumber']),
    },
    skip,
    limit
  );

export const findById = (id, gymId) =>
  aggregateOne(Sale, { match: { _id: id, gymId }, lookups: orderLookups, project: salePublic });

export const stats = async (gymId) => {
  const result = await sumField(Sale, { match: { gymId }, field: 'totalAmount' });
  const tax = await sumField(Sale, { match: { gymId }, field: 'taxAmount' });
  return { _sum: { totalAmount: result.total, taxAmount: tax.total }, _count: result.count };
};

export const fulfillmentStats = async (gymId) => {
  const rows = await groupCount(Sale, { match: { gymId }, by: 'fulfillmentStatus' });
  return Object.fromEntries(rows.map((row) => [row._id, row.count]));
};

export const create = async ({ gymId, memberId, items, notes, fulfillmentType, status }) => {
  const products = await Product.find({
    _id: { $in: items.map((i) => i.productId) },
    gymId,
    deletedAt: null,
    isActive: true,
  }).lean();
  if (products.length !== items.length) throw new Error('PRODUCT_NOT_FOUND');

  const priced = items.map((item) => {
    const product = products.find((p) => p._id === item.productId);
    if (product.stockQty < item.quantity) throw new Error('INSUFFICIENT_STOCK');
    const unitPrice = Number(product.price);
    return { productId: item.productId, quantity: item.quantity, unitPrice, total: unitPrice * item.quantity };
  });
  const totalAmount = priced.reduce((sum, item) => sum + item.total, 0);
  const count = await Sale.countDocuments({ gymId });
  const orderNumber = `ORD-${String(count + 1).padStart(4, '0')}`;

  await Promise.all(
    priced.map((item) => Product.updateOne({ _id: item.productId }, { $inc: { stockQty: -item.quantity } }))
  );

  const sale = await createDoc(Sale, {
    gymId,
    memberId,
    orderNumber,
    totalAmount,
    taxAmount: null,
    status: status || 'COMPLETED',
    fulfillmentStatus: STORE_ORDER_STATUS.PLACED,
    fulfillmentType: fulfillmentType || 'PICKUP',
    notes: notes || null,
  });

  await SaleItem.insertMany(priced.map((item) => ({ ...item, saleId: sale.id, gymId })));
  return findById(sale.id, gymId);
};

export const updateFulfillment = async (id, { fulfillmentStatus, notes }) => {
  await updateById(Sale, id, {
    fulfillmentStatus,
    ...(notes !== undefined && { notes }),
    ...(fulfillmentStatus === STORE_ORDER_STATUS.COLLECTED && { collectedAt: new Date() }),
  });
  const sale = await Sale.findById(id).lean();
  return findById(id, sale?.gymId);
};

export const findByMember = (gymId, memberId, { skip, limit }) => list({ gymId, memberId }, skip, limit);
