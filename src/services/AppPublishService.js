import * as InviteModel from '../models/InviteModel.js';
import { Gym } from '../schemas/index.js';
import { asDoc, updateById, updateMany } from '../helpers/document.js';
import { notDeleted } from '../helpers/query.js';
import { APP_AD_CHANNELS } from '../helpers/constants.js';
import { normalizeAppAds } from '../helpers/appAds.js';
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from '../utils/errors.js';

const ALIAS_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const normalizeAlias = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const mapPublish = (gym) => {
  const appAds = normalizeAppAds(gym.appAds, gym.adsEnabled);
  return {
    gymId: gym.id,
    gymName: gym.name,
    slug: gym.slug,
    appAlias: gym.appAlias,
    appPublished: gym.appPublished,
    adsEnabled: appAds.banners,
    appAds,
    isActive: gym.isActive,
    tenant: gym.tenant
      ? { id: gym.tenant.id, name: gym.tenant.name, slug: gym.tenant.slug }
      : null,
  };
};

const mapGymAds = (gym) => ({
  id: gym.id,
  name: gym.name,
  appAds: normalizeAppAds(gym.appAds, gym.adsEnabled),
});

const getInviteGym = async (inviteId) => {
  const invite = await InviteModel.findById(inviteId);

  if (!invite) throw new NotFoundError('Invite not found');
  if (invite.status !== 'ACCEPTED' || !invite.tenantId) {
    throw new BadRequestError('Publish is only available after the invite is accepted');
  }

  const gym = invite.tenant?.gyms?.[0];
  if (!gym) throw new NotFoundError('No gym found for this invite');

  return { invite, gym: { ...gym, tenant: invite.tenant } };
};

export const getPublishByInvite = async (inviteId) => {
  const { invite, gym } = await getInviteGym(inviteId);
  return {
    invite: {
      id: invite.id,
      email: invite.email,
      inviteeName: invite.inviteeName,
      businessName: invite.businessName,
      status: invite.status,
    },
    publish: mapPublish(gym),
  };
};

export const updatePublishByInvite = async (inviteId, body) => {
  const { gym } = await getInviteGym(inviteId);
  const data = {};

  if (body.appAlias != null) {
    if (gym.appAlias) {
      throw new BadRequestError('App alias cannot be changed once set');
    }
    const alias = normalizeAlias(body.appAlias);
    if (!alias || alias.length < 2 || alias.length > 60) {
      throw new BadRequestError('Alias must be 2–60 characters (letters, numbers, hyphens)');
    }
    if (!ALIAS_RE.test(alias)) {
      throw new BadRequestError('Alias must be lowercase letters, numbers, and hyphens only');
    }

    const taken = asDoc(
      await Gym.findOne({
        appAlias: alias,
        _id: { $ne: gym.id },
        ...notDeleted,
      }).select('_id')
    );
    if (taken) throw new ConflictError('This app alias is already in use');

    data.appAlias = alias;
    data.appPublished = true;
  }

  if (typeof body.adsEnabled === 'boolean') {
    data.adsEnabled = body.adsEnabled;
    data['appAds.banners'] = body.adsEnabled;
  }

  if (typeof body.appPublished === 'boolean' && !data.appPublished) {
    if (body.appPublished && !(gym.appAlias || data.appAlias)) {
      throw new BadRequestError('Set an app alias before publishing');
    }
    data.appPublished = body.appPublished;
  }

  if (Object.keys(data).length === 0) {
    throw new BadRequestError('Nothing to update');
  }

  const updated = await updateById(Gym, gym.id, data);
  return mapPublish({ ...updated, tenant: gym.tenant });
};

export const updateAppAdsByInvite = async (inviteId, body) => {
  const invite = await InviteModel.findById(inviteId);
  if (!invite) throw new NotFoundError('Invite not found');
  if (invite.status !== 'ACCEPTED' || !invite.tenantId) {
    throw new BadRequestError('App ads can only be managed after the invite is accepted');
  }

  const gyms = invite.tenant?.gyms || [];
  if (!gyms.length) throw new NotFoundError('No gym found for this invite');

  if (body.gymId && !gyms.some((gym) => gym.id === body.gymId)) {
    throw new NotFoundError('Gym not found for this invite');
  }

  const $set = {};
  for (const key of APP_AD_CHANNELS) {
    if (typeof body[key] === 'boolean') $set[`appAds.${key}`] = body[key];
  }
  if (typeof body.banners === 'boolean') $set.adsEnabled = body.banners;

  if (Object.keys($set).length === 0) {
    throw new BadRequestError('Provide at least one app ad flag');
  }

  const match = {
    tenantId: invite.tenantId,
    ...notDeleted,
    ...(body.gymId ? { _id: body.gymId } : {}),
  };
  await updateMany(Gym, match, $set);

  const rows = await Gym.find({ tenantId: invite.tenantId, ...notDeleted })
    .select('name appAds adsEnabled')
    .sort({ createdAt: 1 });

  return { gyms: rows.map((row) => mapGymAds(asDoc(row))) };
};
