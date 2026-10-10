import * as MediaAdModel from '../models/MediaAdModel.js';
import * as GymModel from '../models/GymModel.js';
import { ForbiddenError, NotFoundError } from '../utils/errors.js';
import { parsePagination, buildPaginationMeta } from '../utils/response.js';
import { MEDIA_AD_TYPES } from '../helpers/constants.js';
import { normalizeAppAds } from '../helpers/appAds.js';

const validateGym = async (tenantId, gymId) => {
  const gym = await GymModel.findById(gymId, tenantId);
  if (!gym) throw new NotFoundError('Gym not found');
  return gym;
};

const assertChannel = (gym, type) => {
  const ads = normalizeAppAds(gym.appAds, gym.adsEnabled);
  if (type === MEDIA_AD_TYPES.VIDEO && !ads.video) {
    throw new ForbiddenError('Video ads are not enabled for this gym');
  }
  if (type === MEDIA_AD_TYPES.AUDIO && !ads.audio) {
    throw new ForbiddenError('Audio ads are not enabled for this gym');
  }
};

export const list = async (tenantId, gymId, query) => {
  const gym = await validateGym(tenantId, gymId);
  const type = query.type?.toUpperCase();
  if (type === MEDIA_AD_TYPES.VIDEO || type === MEDIA_AD_TYPES.AUDIO) {
    assertChannel(gym, type);
  }

  const pagination = parsePagination(query);
  const isActive =
    query.isActive === 'false' ? false : query.isActive === 'true' ? true : undefined;

  const [ads, total] = await MediaAdModel.findMany(gymId, {
    ...pagination,
    type: type === MEDIA_AD_TYPES.VIDEO || type === MEDIA_AD_TYPES.AUDIO ? type : undefined,
    search: pagination.search,
    isActive,
  });

  return {
    ads,
    appAds: normalizeAppAds(gym.appAds, gym.adsEnabled),
    pagination: buildPaginationMeta(total, pagination.page, pagination.limit),
  };
};

export const getById = async (tenantId, gymId, adId) => {
  await validateGym(tenantId, gymId);
  const ad = await MediaAdModel.findById(adId, gymId);
  if (!ad) throw new NotFoundError('Ad not found');
  return ad;
};

export const create = async (tenantId, gymId, data) => {
  const gym = await validateGym(tenantId, gymId);
  const type = String(data.type || '').toUpperCase();
  assertChannel(gym, type);

  return MediaAdModel.create({
    gymId,
    tenantId,
    type,
    title: data.title.trim(),
    mediaUrl: data.mediaUrl,
    thumbnailUrl: data.thumbnailUrl || null,
    clickUrl: data.clickUrl || null,
    durationSec: data.durationSec ?? null,
    fileSize: data.fileSize ?? null,
    mimeType: data.mimeType || null,
    isActive: data.isActive !== false,
    sortOrder: data.sortOrder ?? 0,
  });
};

export const update = async (tenantId, gymId, adId, data) => {
  await validateGym(tenantId, gymId);
  const ad = await MediaAdModel.findById(adId, gymId);
  if (!ad) throw new NotFoundError('Ad not found');

  const next = {};
  if (data.title != null) next.title = data.title.trim();
  if (data.mediaUrl !== undefined) next.mediaUrl = data.mediaUrl;
  if (data.thumbnailUrl !== undefined) next.thumbnailUrl = data.thumbnailUrl;
  if (data.clickUrl !== undefined) next.clickUrl = data.clickUrl;
  if (data.durationSec !== undefined) next.durationSec = data.durationSec;
  if (data.fileSize !== undefined) next.fileSize = data.fileSize;
  if (data.mimeType !== undefined) next.mimeType = data.mimeType;
  if (typeof data.isActive === 'boolean') next.isActive = data.isActive;
  if (data.sortOrder !== undefined) next.sortOrder = data.sortOrder;

  return MediaAdModel.update(adId, next);
};

export const remove = async (tenantId, gymId, adId) => {
  await validateGym(tenantId, gymId);
  const ad = await MediaAdModel.findById(adId, gymId);
  if (!ad) throw new NotFoundError('Ad not found');
  await MediaAdModel.softDelete(adId);
  return { message: 'Ad deleted' };
};
