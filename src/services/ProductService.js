import * as ProductModel from '../models/ProductModel.js';
import * as GymModel from '../models/GymModel.js';
import { NotFoundError } from '../utils/errors.js';
import { parsePagination, buildPaginationMeta } from '../utils/response.js';

const validateGym = async (tenantId, gymId) => {
  const gym = await GymModel.findById(gymId, tenantId);
  if (!gym) throw new NotFoundError('Gym not found');
  return gym;
};

export const list = async (tenantId, gymId, query) => {
  await validateGym(tenantId, gymId);
  const pagination = parsePagination(query);
  const [products, total] = await ProductModel.findMany(gymId, {
    ...pagination,
    search: pagination.search,
    categoryId: query.categoryId,
    lowStock: query.lowStock === 'true',
  });
  return { products, pagination: buildPaginationMeta(total, pagination.page, pagination.limit) };
};

export const stats = async (tenantId, gymId) => ProductModel.stats(gymId);

export const getById = async (tenantId, gymId, productId) => {
  await validateGym(tenantId, gymId);
  const product = await ProductModel.findById(productId, gymId);
  if (!product) throw new NotFoundError('Product not found');
  return product;
};

export const create = async (tenantId, gymId, body) => {
  await validateGym(tenantId, gymId);
  return ProductModel.create({
    gymId,
    categoryId: body.categoryId || null,
    name: body.name,
    description: body.description || null,
    sku: body.sku || null,
    price: body.price,
    costPrice: body.costPrice ?? null,
    stockQty: body.stockQty ?? 0,
    lowStockAt: body.lowStockAt ?? 5,
    images: body.images || [],
    customFields: body.customFields || [],
    isActive: body.isActive !== false,
  });
};

export const update = async (tenantId, gymId, productId, body) => {
  await validateGym(tenantId, gymId);
  const existing = await ProductModel.findById(productId, gymId);
  if (!existing) throw new NotFoundError('Product not found');
  return ProductModel.update(productId, {
    ...(body.categoryId !== undefined && { categoryId: body.categoryId }),
    ...(body.name !== undefined && { name: body.name }),
    ...(body.description !== undefined && { description: body.description }),
    ...(body.sku !== undefined && { sku: body.sku }),
    ...(body.price !== undefined && { price: body.price }),
    ...(body.costPrice !== undefined && { costPrice: body.costPrice }),
    ...(body.stockQty !== undefined && { stockQty: body.stockQty }),
    ...(body.lowStockAt !== undefined && { lowStockAt: body.lowStockAt }),
    ...(body.images !== undefined && { images: body.images }),
    ...(body.customFields !== undefined && { customFields: body.customFields }),
    ...(body.isActive !== undefined && { isActive: body.isActive }),
  });
};

export const remove = async (tenantId, gymId, productId) => {
  await validateGym(tenantId, gymId);
  const existing = await ProductModel.findById(productId, gymId);
  if (!existing) throw new NotFoundError('Product not found');
  await ProductModel.softDelete(productId);
  return { message: 'Product removed successfully' };
};
