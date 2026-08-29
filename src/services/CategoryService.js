import * as CategoryModel from '../models/CategoryModel.js';
import * as GymModel from '../models/GymModel.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';

const validateGym = async (tenantId, gymId) => {
  const gym = await GymModel.findById(gymId, tenantId);
  if (!gym) throw new NotFoundError('Gym not found');
  return gym;
};

export const list = async (tenantId, gymId) => {
  await validateGym(tenantId, gymId);
  return CategoryModel.findMany(gymId);
};

export const create = async (tenantId, gymId, body) => {
  await validateGym(tenantId, gymId);
  return CategoryModel.create({ gymId, name: body.name.trim() });
};

export const update = async (tenantId, gymId, categoryId, body) => {
  await validateGym(tenantId, gymId);
  const existing = await CategoryModel.findById(categoryId, gymId);
  if (!existing) throw new NotFoundError('Category not found');
  return CategoryModel.update(categoryId, { name: body.name.trim() });
};

export const remove = async (tenantId, gymId, categoryId) => {
  await validateGym(tenantId, gymId);
  const existing = await CategoryModel.findById(categoryId, gymId);
  if (!existing) throw new NotFoundError('Category not found');
  if (existing._count?.products > 0) {
    throw new ValidationError('Cannot delete category with products. Reassign or remove products first.');
  }
  await CategoryModel.remove(categoryId);
  return { message: 'Category deleted successfully' };
};
