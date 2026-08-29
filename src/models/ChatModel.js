import prisma from '../config/database.js';

const senderSelect = {
  id: true,
  firstName: true,
  lastName: true,
  avatar: true,
  role: true,
};

export const findMany = (gymId, limit = 100) =>
  prisma.gymChatMessage.findMany({
    where: { gymId, deletedAt: null },
    orderBy: [{ isPinned: 'desc' }, { createdAt: 'asc' }],
    take: limit,
    include: {
      sender: { select: senderSelect },
      pinnedBy: { select: senderSelect },
    },
  });

export const findById = (id, gymId) =>
  prisma.gymChatMessage.findFirst({
    where: { id, gymId, deletedAt: null },
    include: {
      sender: { select: senderSelect },
      pinnedBy: { select: senderSelect },
    },
  });

export const create = (data) =>
  prisma.gymChatMessage.create({
    data,
    include: {
      sender: { select: senderSelect },
      pinnedBy: { select: senderSelect },
    },
  });

export const updateContent = (id, content) =>
  prisma.gymChatMessage.update({
    where: { id },
    data: { content, editedAt: new Date() },
    include: {
      sender: { select: senderSelect },
      pinnedBy: { select: senderSelect },
    },
  });

export const setPinned = (id, { isPinned, pinnedById }) =>
  prisma.gymChatMessage.update({
    where: { id },
    data: {
      isPinned,
      pinnedAt: isPinned ? new Date() : null,
      pinnedById: isPinned ? pinnedById : null,
    },
    include: {
      sender: { select: senderSelect },
      pinnedBy: { select: senderSelect },
    },
  });

export const unpinAll = (gymId, exceptId = null) =>
  prisma.gymChatMessage.updateMany({
    where: {
      gymId,
      isPinned: true,
      deletedAt: null,
      ...(exceptId ? { id: { not: exceptId } } : {}),
    },
    data: { isPinned: false, pinnedAt: null, pinnedById: null },
  });

export const softDelete = (id) =>
  prisma.gymChatMessage.update({
    where: { id },
    data: { deletedAt: new Date(), isPinned: false, pinnedAt: null, pinnedById: null },
  });
