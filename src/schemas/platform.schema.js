import mongoose from 'mongoose';
import { defineSchema } from '../helpers/schema.js';
import { COLLECTIONS } from '../helpers/constants.js';

export const GymInvite = mongoose.models.GymInvite || mongoose.model(
  'GymInvite',
  defineSchema(
    {
      email: { type: String, required: true, lowercase: true, index: true },
      inviteeName: String,
      businessName: String,
      note: String,
      /** ONBOARD = first gym + new owner; EXTRA_BRANCH = paid branch for existing tenant */
      purpose: {
        type: String,
        enum: ['ONBOARD', 'EXTRA_BRANCH'],
        default: 'ONBOARD',
        index: true,
      },
      existingTenantId: { type: String, index: true },
      parentInviteId: { type: String, index: true },
      token: { type: String, required: true, unique: true },
      planId: { type: String, required: true },
      status: { type: String, default: 'PENDING', index: true },
      expiresAt: { type: Date, required: true },
      sentAt: Date,
      acceptedAt: Date,
      createdById: String,
      tenantId: String,
      razorpayOrderId: String,
      razorpayPaymentId: String,
      onboardingData: { type: mongoose.Schema.Types.Mixed },
    },
    { collection: COLLECTIONS.GYM_INVITES, indexes: [{ keys: { status: 1, createdAt: -1 } }] }
  )
);

export const SupportTicket = mongoose.models.SupportTicket || mongoose.model(
  'SupportTicket',
  defineSchema(
    {
      tenantId: { type: String, index: true },
      userId: { type: String, required: true, index: true },
      category: { type: String, required: true },
      subject: { type: String, required: true },
      message: { type: String, required: true },
      senderEmail: { type: String, required: true },
      senderName: String,
      status: { type: String, default: 'OPEN', index: true },
      emailSent: { type: Boolean, default: false },
    },
    { collection: COLLECTIONS.SUPPORT_TICKETS }
  )
);

export const SupportTicketMessage = mongoose.models.SupportTicketMessage || mongoose.model(
  'SupportTicketMessage',
  defineSchema(
    {
      ticketId: { type: String, required: true, index: true },
      userId: { type: String, required: true },
      authorRole: { type: String, required: true },
      authorName: String,
      body: { type: String, required: true },
    },
    { collection: COLLECTIONS.SUPPORT_TICKET_MESSAGES, indexes: [{ keys: { ticketId: 1, createdAt: 1 } }] }
  )
);

export const PlatformBroadcast = mongoose.models.PlatformBroadcast || mongoose.model(
  'PlatformBroadcast',
  defineSchema(
    {
      message: { type: String, required: true },
      isActive: { type: Boolean, default: true, index: true },
      createdById: String,
    },
    { collection: COLLECTIONS.PLATFORM_BROADCASTS, indexes: [{ keys: { isActive: 1, createdAt: -1 } }] }
  )
);

export const Notification = mongoose.models.Notification || mongoose.model(
  'Notification',
  defineSchema(
    {
      tenantId: String,
      userId: String,
      gymId: String,
      channel: { type: String, required: true },
      type: String,
      title: { type: String, required: true },
      message: { type: String, required: true },
      status: { type: String, default: 'PENDING' },
      metadata: { type: mongoose.Schema.Types.Mixed },
      sentAt: Date,
      readAt: Date,
    },
    { collection: COLLECTIONS.NOTIFICATIONS, indexes: [{ keys: { userId: 1, createdAt: -1 } }] }
  )
);

export const AuditLog = mongoose.models.AuditLog || mongoose.model(
  'AuditLog',
  defineSchema(
    {
      tenantId: String,
      userId: String,
      action: { type: String, required: true },
      entity: String,
      entityId: String,
      oldData: { type: mongoose.Schema.Types.Mixed },
      newData: { type: mongoose.Schema.Types.Mixed },
      ipAddress: String,
      userAgent: String,
    },
    { collection: COLLECTIONS.AUDIT_LOGS }
  )
);

export const ContactMessage = mongoose.models.ContactMessage || mongoose.model(
  'ContactMessage',
  defineSchema(
    {
      name: { type: String, required: true },
      email: { type: String, required: true },
      company: String,
      message: { type: String, required: true },
    },
    { collection: COLLECTIONS.CONTACT_MESSAGES }
  )
);

export const Role = mongoose.models.Role || mongoose.model(
  'Role',
  defineSchema(
    {
      name: { type: String, required: true, unique: true },
      slug: { type: String, required: true, unique: true },
      description: String,
      scope: { type: String, default: 'gym' },
      isSystem: { type: Boolean, default: false },
    },
    { collection: COLLECTIONS.ROLES }
  )
);

export const Permission = mongoose.models.Permission || mongoose.model(
  'Permission',
  defineSchema(
    {
      name: { type: String, required: true },
      slug: { type: String, required: true, unique: true },
      module: { type: String, required: true },
      description: String,
      scope: { type: String, default: 'gym' },
    },
    { collection: COLLECTIONS.PERMISSIONS }
  )
);

export const RolePermission = mongoose.models.RolePermission || mongoose.model(
  'RolePermission',
  defineSchema(
    {
      roleId: { type: String, required: true },
      permissionId: { type: String, required: true },
    },
    {
      collection: COLLECTIONS.ROLE_PERMISSIONS,
      indexes: [{ keys: { roleId: 1, permissionId: 1 }, options: { unique: true } }],
    }
  )
);

export const UserRoleAssignment = mongoose.models.UserRoleAssignment || mongoose.model(
  'UserRoleAssignment',
  defineSchema(
    {
      userId: { type: String, required: true },
      roleId: { type: String, required: true },
      gymId: String,
    },
    { collection: COLLECTIONS.USER_ROLE_ASSIGNMENTS }
  )
);
