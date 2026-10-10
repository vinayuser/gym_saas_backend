/** Shared enums, collection names, and query defaults. */

export const PAGE = {
  DEFAULT: 10,
  MAX: 100,
};

export const SORT = {
  CREATED_DESC: { createdAt: -1 },
  CREATED_ASC: { createdAt: 1 },
  NAME_ASC: { name: 1 },
  START_ASC: { startAt: 1 },
};

export const COLLECTIONS = {
  USERS: 'users',
  REFRESH_TOKENS: 'refresh_tokens',
  PASSWORD_RESETS: 'password_resets',
  OTP_VERIFICATIONS: 'otp_verifications',
  TENANTS: 'tenants',
  SUBSCRIPTION_PLANS: 'subscription_plans',
  SUBSCRIPTIONS: 'subscriptions',
  SAAS_PAYMENTS: 'saas_payments',
  GYMS: 'gyms',
  GYM_BRANCHES: 'gym_branches',
  GYM_STAFF: 'gym_staff',
  TRAINERS: 'trainers',
  MEMBERS: 'members',
  BODY_MEASUREMENTS: 'body_measurements',
  GYM_MEMBERSHIP_PLANS: 'gym_membership_plans',
  MEMBERSHIPS: 'memberships',
  MEMBER_PAYMENTS: 'member_payments',
  INVOICES: 'invoices',
  COUPONS: 'coupons',
  OFFERS: 'offers',
  ATTENDANCE: 'attendance',
  EVENTS: 'events',
  EVENT_BOOKINGS: 'event_bookings',
  ENQUIRIES: 'enquiries',
  PRODUCT_CATEGORIES: 'product_categories',
  PRODUCTS: 'products',
  SALES: 'sales',
  SALE_ITEMS: 'sale_items',
  BANNERS: 'banners',
  GYM_MEDIA_ADS: 'gym_media_ads',
  GYM_CHAT_MESSAGES: 'gym_chat_messages',
  SUPPORT_TICKETS: 'support_tickets',
  SUPPORT_TICKET_MESSAGES: 'support_ticket_messages',
  NOTIFICATIONS: 'notifications',
  AUDIT_LOGS: 'audit_logs',
  WORKOUT_PLANS: 'workout_plans',
  DIET_PLANS: 'diet_plans',
  DAY_PASSES: 'day_passes',
  CARTS: 'carts',
  CONTACT_MESSAGES: 'contact_messages',
  GYM_INVITES: 'gym_invites',
  PLATFORM_BROADCASTS: 'platform_broadcasts',
  PLATFORM_CATALOG: 'platform_catalog',
  PLATFORM_ADDONS: 'platform_addons',
  ROLES: 'roles',
  PERMISSIONS: 'permissions',
  ROLE_PERMISSIONS: 'role_permissions',
  USER_ROLE_ASSIGNMENTS: 'user_role_assignments',
};

export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  PLATFORM_ADMIN: 'PLATFORM_ADMIN',
  GYM_OWNER: 'GYM_OWNER',
  MANAGER: 'MANAGER',
  RECEPTIONIST: 'RECEPTIONIST',
  TRAINER: 'TRAINER',
  MEMBER: 'MEMBER',
};

export const USER_STATUS = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  SUSPENDED: 'SUSPENDED',
  PENDING_VERIFICATION: 'PENDING_VERIFICATION',
};

export const MEMBERSHIP_STATUS = {
  ACTIVE: 'ACTIVE',
  FROZEN: 'FROZEN',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED',
  PENDING: 'PENDING',
};

export const PAYMENT_STATUS = {
  PENDING: 'PENDING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
};

export const INVOICE_STATUS = {
  DRAFT: 'DRAFT',
  ISSUED: 'ISSUED',
  PAID: 'PAID',
  OVERDUE: 'OVERDUE',
  CANCELLED: 'CANCELLED',
};

export const STORE_ORDER_STATUS = {
  PLACED: 'PLACED',
  CONFIRMED: 'CONFIRMED',
  PREPARING: 'PREPARING',
  READY_FOR_PICKUP: 'READY_FOR_PICKUP',
  COLLECTED: 'COLLECTED',
  CANCELLED: 'CANCELLED',
};

export const CATALOG_ID = 'default';

export const MEDIA_AD_TYPES = {
  VIDEO: 'VIDEO',
  AUDIO: 'AUDIO',
};

export const APP_AD_CHANNELS = ['banners', 'video', 'audio'];

export const DEFAULT_APP_ADS = {
  banners: true,
  video: false,
  audio: false,
};
