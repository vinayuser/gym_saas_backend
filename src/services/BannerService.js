import * as BannerModel from '../models/BannerModel.js';
import * as GymModel from '../models/GymModel.js';
import { NotFoundError } from '../utils/errors.js';
import { parsePagination, buildPaginationMeta } from '../utils/response.js';

const validateGym = async (tenantId, gymId) => {
  const gym = await GymModel.findById(gymId, tenantId);
  if (!gym) throw new NotFoundError('Gym not found');
  return gym;
};

export const deriveStatus = (banner, now = new Date()) => {
  if (!banner.isActive) return 'ARCHIVED';
  if (banner.startDate && new Date(banner.startDate) > now) return 'SCHEDULED';
  if (banner.endDate && new Date(banner.endDate) < now) return 'EXPIRED';
  return 'ACTIVE';
};

const withComputed = (banner) => {
  const status = deriveStatus(banner);
  const ctr =
    banner.impressions > 0
      ? Math.round((banner.clicks / banner.impressions) * 1000) / 10
      : 0;
  return { ...banner, computedStatus: status, ctr };
};

const syncStatus = async (banner) => {
  const computed = deriveStatus(banner);
  if (banner.status !== computed) {
    await BannerModel.update(banner.id, { status: computed });
    return { ...banner, status: computed };
  }
  return banner;
};

export const list = async (tenantId, gymId, query) => {
  await validateGym(tenantId, gymId);

  const pagination = parsePagination(query);
  const statusFilter = query.status?.toUpperCase();

  const [rows, total] = await BannerModel.findMany(gymId, {
    ...pagination,
    search: pagination.search,
    status: statusFilter && statusFilter !== 'ALL' ? statusFilter : undefined,
  });

  const synced = await Promise.all(rows.map(syncStatus));
  const banners = synced.map(withComputed);

  return {
    banners,
    pagination: buildPaginationMeta(total, pagination.page, pagination.limit),
  };
};

export const getById = async (tenantId, gymId, bannerId) => {
  await validateGym(tenantId, gymId);
  const banner = await BannerModel.findById(bannerId, gymId);
  if (!banner) throw new NotFoundError('Banner not found');
  const synced = await syncStatus(banner);
  return withComputed(synced);
};

const buildBannerData = (body, gymId = null) => {
  const now = new Date();
  const toDate = (v) => {
    if (!v) return null;
    return v instanceof Date ? v : new Date(v);
  };

  const data = {
    ...(gymId ? { gymId } : {}),
    name: body.name,
    internalCode: body.internalCode || null,
    category: body.category || 'PROMOTION',
    placement: body.placement || 'GLOBAL_HOMEPAGE',
    imageUrl: body.imageUrl || null,
    startDate: toDate(body.startDate),
    endDate: toDate(body.endDate),
    timeSlots: body.timeSlots || [],
    targetAudience: body.targetAudience || [],
    ctaType: body.ctaType || null,
    ctaDestination: body.ctaDestination || null,
    isActive: body.isActive !== undefined ? body.isActive : true,
    sortOrder: body.sortOrder ?? 0,
  };

  const draft = { ...data, status: 'DRAFT' };
  data.status = body.status || deriveStatus({ ...draft, isActive: data.isActive }, now);

  return data;
};

export const create = async (tenantId, gymId, body) => {
  await validateGym(tenantId, gymId);
  const data = buildBannerData(body, gymId);
  const banner = await BannerModel.create(data);
  return withComputed(banner);
};

export const update = async (tenantId, gymId, bannerId, body) => {
  await validateGym(tenantId, gymId);
  const existing = await BannerModel.findById(bannerId, gymId);
  if (!existing) throw new NotFoundError('Banner not found');

  const merged = { ...existing, ...body };
  const data = buildBannerData(merged);
  const banner = await BannerModel.update(bannerId, data);
  return withComputed(await syncStatus(banner));
};

export const remove = async (tenantId, gymId, bannerId) => {
  await validateGym(tenantId, gymId);
  const existing = await BannerModel.findById(bannerId, gymId);
  if (!existing) throw new NotFoundError('Banner not found');
  await BannerModel.softDelete(bannerId);
  return { message: 'Banner deleted successfully' };
};

export const duplicate = async (tenantId, gymId, bannerId) => {
  const source = await getById(tenantId, gymId, bannerId);
  const copy = await BannerModel.create({
    gymId,
    name: `${source.name} (Copy)`,
    internalCode: source.internalCode ? `${source.internalCode}-COPY` : null,
    category: source.category,
    placement: source.placement,
    imageUrl: source.imageUrl,
    startDate: source.startDate,
    endDate: source.endDate,
    status: 'DRAFT',
    timeSlots: source.timeSlots,
    targetAudience: source.targetAudience,
    ctaType: source.ctaType,
    ctaDestination: source.ctaDestination,
    impressions: 0,
    clicks: 0,
    isActive: false,
    sortOrder: source.sortOrder,
  });
  return withComputed(copy);
};

export const stats = async (tenantId, gymId) => {
  await validateGym(tenantId, gymId);
  const [rows] = await BannerModel.findMany(gymId, { skip: 0, limit: 1000 });
  const banners = rows.map(withComputed);
  const active = banners.filter((b) => b.computedStatus === 'ACTIVE').length;
  const totalImpressions = banners.reduce((s, b) => s + b.impressions, 0);
  const totalClicks = banners.reduce((s, b) => s + b.clicks, 0);
  const avgCtr =
    totalImpressions > 0
      ? Math.round((totalClicks / totalImpressions) * 1000) / 10
      : 0;

  return { active, totalImpressions, avgCtr, total: banners.length };
};
