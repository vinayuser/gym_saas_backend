import { iso } from './common.js';

export const toNotificationListItemDto = (n) => ({
  id: n.id,
  type: n.type || n.metadata?.type || 'general',
  title: n.title,
  message: n.message,
  channel: n.channel,
  isRead: Boolean(n.readAt),
  createdAt: iso(n.createdAt || n.sentAt),
  relativeHint: null,
  metadata: n.metadata || {},
});

export const toNotificationDetailDto = (n) => ({
  ...toNotificationListItemDto(n),
  eventSnippet: n.metadata?.eventSnippet || null,
  enrollmentStatus: n.metadata?.enrollmentStatus || null,
  speaker: n.metadata?.speaker || null,
  location: n.metadata?.location || null,
  actions: n.metadata?.actions || [
    { type: 'dismiss', label: 'Dismiss' },
  ],
});

export const toNotificationSettingsDto = (prefs = {}) => ({
  emailAlerts: prefs.emailAlerts !== false,
  smsReminders: prefs.smsReminders !== false,
  pushNotifications: Boolean(prefs.pushNotifications),
  weeklyDigest: prefs.weeklyDigest !== false,
});
