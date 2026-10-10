import { GymChatMessage, User } from '../../../schemas/index.js';
import { COLLECTIONS, SORT } from '../../../helpers/constants.js';
import { lookupOne, notDeleted } from '../../../helpers/query.js';
import { createDoc, asDoc } from '../../../helpers/document.js';
import { BadRequestError } from '../../../utils/errors.js';
import { toChatMessageDto } from '../dto/event.dto.js';

export const listMessages = async (member, userId, { limit = 40 } = {}) => {
  const messages = await GymChatMessage.aggregate([
    { $match: { gymId: member.gymId, ...notDeleted } },
    { $sort: SORT.CREATED_DESC },
    { $limit: Math.min(Number(limit) || 40, 80) },
    { $sort: { createdAt: 1 } },
    ...lookupOne(COLLECTIONS.USERS, 'senderId', 'sender', {
      _id: 0,
      id: '$_id',
      firstName: 1,
      lastName: 1,
      role: 1,
      avatar: 1,
    }),
    {
      $project: {
        _id: 0,
        id: '$_id',
        gymId: 1,
        senderId: 1,
        content: 1,
        mediaUrl: 1,
        mediaType: 1,
        isPinned: 1,
        createdAt: 1,
        sender: 1,
      },
    },
  ]);

  const onlineCount = await User.countDocuments({
    tenantId: member.tenantId,
    status: 'ACTIVE',
    ...notDeleted,
  });

  return {
    channelName: 'Community Chat',
    onlineCount,
    maintenanceBanner: null,
    messages: messages.map((m) => toChatMessageDto(m, userId)),
  };
};

export const sendMessage = async (member, userId, body) => {
  if (!body?.content && !body?.mediaUrl) {
    throw new BadRequestError('Message is empty');
  }

  const message = await createDoc(GymChatMessage, {
    gymId: member.gymId,
    tenantId: member.tenantId,
    senderId: userId,
    content: body.content || '',
    mediaUrl: body.mediaUrl || null,
    mediaType: body.mediaType || null,
  });

  const sender = asDoc(await User.findById(userId).select('firstName lastName role avatar'));

  return toChatMessageDto(
    {
      ...message,
      sender: sender
        ? {
            id: sender.id,
            firstName: sender.firstName,
            lastName: sender.lastName,
            role: sender.role,
            avatar: sender.avatar,
          }
        : null,
    },
    userId
  );
};
