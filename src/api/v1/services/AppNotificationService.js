import { Notification } from '../../../schemas/index.js';
import { asDoc, updateById, createDoc } from '../../../helpers/document.js';
import { notDeleted } from '../../../helpers/query.js';
import { NotFoundError } from '../../../utils/errors.js';
import { toNotificationListItemDto, toNotificationDetailDto } from '../dto/notification.dto.js';

/** Ensure the member has a few inbox items so the app isn't empty on first open. */
const ensureSeedNotifications = async (member, userId) => {
  const count = await Notification.countDocuments({ userId, ...notDeleted });
  if (count > 0) return;

  const seeds = [
    {
      type: 'class_reminder',
      title: 'Class reminder',
      message: 'Nutrition Workshop tomorrow at 10:00 AM',
      metadata: {
        type: 'class_reminder',
        eventSnippet: {
          title: 'Nutrition Workshop',
          dateLabel: 'Tomorrow 10:00 AM',
        },
        enrollmentStatus: 'Enrolled',
        speaker: 'Nutrition Team',
        location: 'Gym Hall',
        actions: [
          { type: 'view_event', label: 'View event' },
          { type: 'dismiss', label: 'Dismiss' },
        ],
      },
    },
    {
      type: 'membership_due',
      title: 'Membership renewal',
      message: 'Your Premium plan renews in 3 days',
      metadata: { type: 'membership_due' },
    },
    {
      type: 'order_ready',
      title: 'Order ready for pickup',
      message: 'Your store order is ready at the front desk',
      metadata: { type: 'order_ready' },
    },
  ];

  for (const seed of seeds) {
    await createDoc(Notification, {
      tenantId: member.tenantId,
      userId,
      gymId: member.gymId,
      channel: 'IN_APP',
      type: seed.type,
      title: seed.title,
      message: seed.message,
      status: 'SENT',
      sentAt: new Date(),
      metadata: seed.metadata,
    });
  }
};

export const listNotifications = async (member, userId) => {
  await ensureSeedNotifications(member, userId);

  const rows = await Notification.find({ userId, ...notDeleted })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  const notifications = rows.map((n) => toNotificationListItemDto({ ...n, id: n._id }));
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return { unreadCount, notifications };
};

export const getNotification = async (userId, notificationId) => {
  const row = asDoc(await Notification.findOne({ _id: notificationId, userId, ...notDeleted }));
  if (!row) throw new NotFoundError('Notification not found');
  if (!row.readAt) {
    await updateById(Notification, row.id, { readAt: new Date() });
    row.readAt = new Date();
  }
  return toNotificationDetailDto(row);
};

export const markRead = async (userId, body = {}) => {
  const ids = body.ids || body.notificationIds || [];
  const match = { userId, readAt: null, ...notDeleted };
  if (ids.length) match._id = { $in: ids };

  const result = await Notification.updateMany(match, { $set: { readAt: new Date() } });
  return { marked: result.modifiedCount || 0 };
};
