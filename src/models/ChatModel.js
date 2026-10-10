import { GymChatMessage } from '../schemas/index.js';
import { aggregateOne } from '../helpers/pagination.js';
import { createDoc, updateById } from '../helpers/document.js';
import { lookupOne } from '../helpers/query.js';
import { COLLECTIONS } from '../helpers/constants.js';
import { chatPublic } from '../projections/ops.projection.js';
import { userBrief } from '../projections/user.projection.js';

const senderLookups = [
  ...lookupOne(COLLECTIONS.USERS, 'senderId', 'sender', userBrief),
  ...lookupOne(COLLECTIONS.USERS, 'pinnedById', 'pinnedBy', userBrief),
];

export const findMany = (gymId, limit = 100) =>
  GymChatMessage.aggregate([
    { $match: { gymId, deletedAt: null } },
    { $sort: { isPinned: -1, createdAt: 1 } },
    { $limit: limit },
    ...senderLookups,
    { $project: chatPublic },
  ]);

export const findById = (id, gymId) =>
  aggregateOne(GymChatMessage, {
    match: { _id: id, gymId, deletedAt: null },
    lookups: senderLookups,
    project: chatPublic,
  });

export const create = async (data) => {
  const doc = await createDoc(GymChatMessage, data);
  return findById(doc.id, doc.gymId);
};

export const updateContent = async (id, content) => {
  await updateById(GymChatMessage, id, { content, editedAt: new Date() });
  const doc = await GymChatMessage.findById(id).lean();
  return findById(id, doc?.gymId);
};

export const setPinned = async (id, { isPinned, pinnedById }) => {
  await updateById(GymChatMessage, id, {
    isPinned,
    pinnedAt: isPinned ? new Date() : null,
    pinnedById: isPinned ? pinnedById : null,
  });
  const doc = await GymChatMessage.findById(id).lean();
  return findById(id, doc?.gymId);
};

export const unpinAll = (gymId, exceptId = null) =>
  GymChatMessage.updateMany(
    { gymId, isPinned: true, deletedAt: null, ...(exceptId ? { _id: { $ne: exceptId } } : {}) },
    { $set: { isPinned: false, pinnedAt: null, pinnedById: null } }
  );

export const softDelete = (id) =>
  updateById(GymChatMessage, id, { deletedAt: new Date(), isPinned: false, pinnedAt: null, pinnedById: null });
