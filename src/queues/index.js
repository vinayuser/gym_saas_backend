/**
 * BullMQ queue workers — Phase 2+
 * Configure REDIS_URL in .env and import workers here.
 *
 * Planned queues:
 * - notificationQueue (email, SMS, push, WhatsApp)
 * - reportQueue (CSV/PDF/Excel generation)
 * - subscriptionQueue (recurring billing reminders)
 */

export const QUEUE_NAMES = {
  NOTIFICATIONS: 'notifications',
  REPORTS: 'reports',
  SUBSCRIPTIONS: 'subscriptions',
};
