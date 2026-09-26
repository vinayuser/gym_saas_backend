import { v4 as uuidv4 } from 'uuid';
import * as GymModel from '../models/GymModel.js';
import { NotFoundError } from '../utils/errors.js';
import { parsePagination, buildPaginationMeta } from '../utils/response.js';

const slugify = (text) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const EMPTY_ADDONS = { attendance: false, store: false, day_pass: false };

export const list = async (tenantId, query) => {
  const pagination = parsePagination(query);
  const [gyms, total] = await GymModel.findMany(tenantId, pagination);

  return {
    gyms,
    pagination: buildPaginationMeta(total, pagination.page, pagination.limit),
  };
};

export const getById = async (tenantId, gymId) => {
  const gym = await GymModel.findById(gymId, tenantId);
  if (!gym) throw new NotFoundError('Gym not found');
  return gym;
};

export const create = async (tenantId, data) => {
  let slug = slugify(data.name);
  const existing = await GymModel.findBySlug(tenantId, slug);
  if (existing) slug = `${slug}-${Date.now().toString(36)}`;

  return GymModel.create({
    ...data,
    tenantId,
    slug,
    qrCodeSecret: uuidv4(),
    images: [],
    commercialAddons: EMPTY_ADDONS,
  });
};

export const update = async (tenantId, gymId, data) => {
  const gym = await GymModel.findById(gymId, tenantId);
  if (!gym) throw new NotFoundError('Gym not found');

  return GymModel.update(gymId, data);
};

export const remove = async (tenantId, gymId) => {
  const gym = await GymModel.findById(gymId, tenantId);
  if (!gym) throw new NotFoundError('Gym not found');

  await GymModel.softDelete(gymId);
  return { message: 'Gym deleted successfully' };
};
