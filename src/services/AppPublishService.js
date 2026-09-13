import prisma from '../config/database.js';
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

const mapPublish = (gym) => ({
  gymId: gym.id,
  gymName: gym.name,
  slug: gym.slug,
  appAlias: gym.appAlias,
  appPublished: gym.appPublished,
  adsEnabled: gym.adsEnabled,
  isActive: gym.isActive,
  tenant: gym.tenant
    ? { id: gym.tenant.id, name: gym.tenant.name, slug: gym.tenant.slug }
    : null,
});

const getInviteGym = async (inviteId) => {
  const invite = await prisma.gymInvite.findUnique({
    where: { id: inviteId },
    include: {
      tenant: {
        include: {
          gyms: {
            where: { deletedAt: null },
            orderBy: { createdAt: 'asc' },
            take: 1,
            include: {
              tenant: { select: { id: true, name: true, slug: true } },
            },
          },
        },
      },
    },
  });

  if (!invite) throw new NotFoundError('Invite not found');
  if (invite.status !== 'ACCEPTED' || !invite.tenantId) {
    throw new BadRequestError('Publish is only available after the invite is accepted');
  }

  const gym = invite.tenant?.gyms?.[0];
  if (!gym) throw new NotFoundError('No gym found for this invite');

  return { invite, gym };
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

    const taken = await prisma.gym.findFirst({
      where: {
        appAlias: alias,
        id: { not: gym.id },
        deletedAt: null,
      },
      select: { id: true },
    });
    if (taken) throw new ConflictError('This app alias is already in use');

    data.appAlias = alias;
    data.appPublished = true;
  }

  if (typeof body.adsEnabled === 'boolean') {
    data.adsEnabled = body.adsEnabled;
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

  const updated = await prisma.gym.update({
    where: { id: gym.id },
    data,
    include: {
      tenant: { select: { id: true, name: true, slug: true } },
    },
  });

  return mapPublish(updated);
};
