import * as ChatModel from '../models/ChatModel.js';
import * as GymModel from '../models/GymModel.js';
import { NotFoundError, ForbiddenError, BadRequestError } from '../utils/errors.js';

const validateGym = async (tenantId, gymId) => {
  const gym = await GymModel.findById(gymId, tenantId);
  if (!gym) throw new NotFoundError('Gym not found');
  return gym;
};

const isGymOwner = (user) => user.role === 'GYM_OWNER' || user.role === 'SUPER_ADMIN';

const mapMessage = (msg, currentUserId) => ({
  id: msg.id,
  gymId: msg.gymId,
  content: msg.content,
  mediaUrl: msg.mediaUrl,
  mediaType: msg.mediaType,
  isPinned: msg.isPinned,
  pinnedAt: msg.pinnedAt,
  editedAt: msg.editedAt,
  createdAt: msg.createdAt,
  isOwn: msg.senderId === currentUserId,
  sender: msg.sender
    ? {
        id: msg.sender.id,
        name: `${msg.sender.firstName} ${msg.sender.lastName}`.trim(),
        avatar: msg.sender.avatar,
        role: msg.sender.role,
      }
    : null,
  pinnedBy: msg.pinnedBy
    ? {
        id: msg.pinnedBy.id,
        name: `${msg.pinnedBy.firstName} ${msg.pinnedBy.lastName}`.trim(),
      }
    : null,
});

export const list = async (tenantId, gymId, query, userId) => {
  await validateGym(tenantId, gymId);
  const limit = query.limit || 100;
  const rows = await ChatModel.findMany(gymId, limit);
  return {
    room: { id: gymId, type: 'gym_community' },
    messages: rows.map((m) => mapMessage(m, userId)),
  };
};

export const create = async (tenantId, gymId, body, user) => {
  await validateGym(tenantId, gymId);
  const content = body.content?.trim() || null;

  const msg = await ChatModel.create({
    gymId,
    senderId: user.id,
    content,
    mediaUrl: body.mediaUrl || null,
    mediaType: body.mediaType || null,
  });

  return mapMessage(msg, user.id);
};

export const update = async (tenantId, gymId, messageId, body, user) => {
  await validateGym(tenantId, gymId);
  const existing = await ChatModel.findById(messageId, gymId);
  if (!existing) throw new NotFoundError('Message not found');

  const canEdit = isGymOwner(user) || existing.senderId === user.id;
  if (!canEdit) throw new ForbiddenError('You cannot edit this message');

  if (existing.mediaUrl && !body.content?.trim()) {
    throw new BadRequestError('Text is required when editing');
  }

  const msg = await ChatModel.updateContent(messageId, body.content.trim());
  return mapMessage(msg, user.id);
};

export const remove = async (tenantId, gymId, messageId, user) => {
  await validateGym(tenantId, gymId);
  const existing = await ChatModel.findById(messageId, gymId);
  if (!existing) throw new NotFoundError('Message not found');

  const canDelete = isGymOwner(user) || existing.senderId === user.id;
  if (!canDelete) throw new ForbiddenError('You cannot delete this message');

  await ChatModel.softDelete(messageId);
  return { message: 'Message deleted' };
};

export const pin = async (tenantId, gymId, messageId, body, user) => {
  await validateGym(tenantId, gymId);
  if (!isGymOwner(user)) {
    throw new ForbiddenError('Only the gym owner can pin messages');
  }

  const existing = await ChatModel.findById(messageId, gymId);
  if (!existing) throw new NotFoundError('Message not found');

  if (body.isPinned) {
    await ChatModel.unpinAll(gymId, messageId);
  }

  const msg = await ChatModel.setPinned(messageId, {
    isPinned: body.isPinned,
    pinnedById: body.isPinned ? user.id : null,
  });

  return mapMessage(msg, user.id);
};
