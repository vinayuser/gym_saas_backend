export const DEFAULT_NOTIFICATION_PREFERENCES = {
  emailAlerts: true,
  smsReminders: true,
  pushNotifications: false,
  weeklyDigest: true,
};

export const normalizeNotificationPreferences = (value) => ({
  emailAlerts: value?.emailAlerts ?? DEFAULT_NOTIFICATION_PREFERENCES.emailAlerts,
  smsReminders: value?.smsReminders ?? DEFAULT_NOTIFICATION_PREFERENCES.smsReminders,
  pushNotifications: value?.pushNotifications ?? DEFAULT_NOTIFICATION_PREFERENCES.pushNotifications,
  weeklyDigest: value?.weeklyDigest ?? DEFAULT_NOTIFICATION_PREFERENCES.weeklyDigest,
});
