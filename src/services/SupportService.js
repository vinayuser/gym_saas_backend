import * as SupportModel from '../models/SupportModel.js';
import * as EmailService from '../services/EmailService.js';
import { ForbiddenError, NotFoundError } from '../utils/errors.js';
import logger from '../utils/logger.js';
import prisma from '../config/database.js';

const serializeTicket = (ticket) => ({
  id: ticket.id,
  category: ticket.category,
  subject: ticket.subject,
  message: ticket.message,
  senderEmail: ticket.senderEmail,
  senderName: ticket.senderName,
  status: ticket.status,
  emailSent: ticket.emailSent,
  createdAt: ticket.createdAt,
  updatedAt: ticket.updatedAt,
  tenant: ticket.tenant
    ? { id: ticket.tenant.id, name: ticket.tenant.name, email: ticket.tenant.email }
    : null,
  user: ticket.user
    ? {
        id: ticket.user.id,
        email: ticket.user.email,
        name: [ticket.user.firstName, ticket.user.lastName].filter(Boolean).join(' '),
        role: ticket.user.role,
      }
    : null,
});

export const create = async (user, body) => {
  const senderName = [user.firstName, user.lastName].filter(Boolean).join(' ');

  let ticket = await SupportModel.create({
    tenantId: user.tenantId || null,
    userId: user.id,
    category: body.category,
    subject: body.subject.trim(),
    message: body.message.trim(),
    senderEmail: body.replyEmail?.trim().toLowerCase() || user.email,
    senderName: senderName || null,
  });

  const tenant = user.tenantId
    ? await prisma.tenant.findFirst({
        where: { id: user.tenantId, deletedAt: null },
        select: { id: true, name: true, email: true },
      })
    : null;

  try {
    const mailResult = await EmailService.sendSupportTicketEmail({ ticket, tenant, user });
    if (mailResult.delivered) {
      ticket = await SupportModel.update(ticket.id, { emailSent: true });
    }
  } catch (err) {
    logger.warn('Support ticket email failed', { ticketId: ticket.id, err: err.message });
  }

  return serializeTicket(ticket);
};

export const list = async (user, query) => {
  const page = query.page || 1;
  const limit = Math.min(query.limit || 20, 100);
  const skip = (page - 1) * limit;

  const where = {};
  if (user.role !== 'SUPER_ADMIN') {
    if (!user.tenantId) {
      where.userId = user.id;
    } else {
      where.tenantId = user.tenantId;
    }
  }

  if (query.status && query.status !== 'ALL') {
    where.status = query.status;
  }

  if (query.category && query.category !== 'ALL') {
    where.category = query.category;
  }

  if (query.search?.trim()) {
    const search = query.search.trim();
    where.OR = [
      { subject: { contains: search, mode: 'insensitive' } },
      { message: { contains: search, mode: 'insensitive' } },
      { senderEmail: { contains: search, mode: 'insensitive' } },
      { senderName: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [tickets, total] = await Promise.all([
    SupportModel.list({ where, skip, take: limit }),
    SupportModel.count(where),
  ]);

  return {
    tickets: tickets.map(serializeTicket),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
  };
};

export const updateStatus = async (user, ticketId, status) => {
  if (user.role !== 'SUPER_ADMIN') {
    throw new ForbiddenError('Only super admins can update ticket status');
  }

  const existing = await SupportModel.findById(ticketId);
  if (!existing) throw new NotFoundError('Support ticket not found');

  const ticket = await SupportModel.update(ticketId, { status });
  return serializeTicket(ticket);
};
