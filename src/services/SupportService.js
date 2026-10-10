import * as SupportModel from '../models/SupportModel.js';
import * as EmailService from '../services/EmailService.js';
import { Tenant } from '../schemas/index.js';
import { asDoc } from '../helpers/document.js';
import { notDeleted, textSearch } from '../helpers/query.js';
import { ROLES } from '../helpers/constants.js';
import { BadRequestError, ForbiddenError, NotFoundError } from '../utils/errors.js';
import logger from '../utils/logger.js';

const isPlatform = (user) => user?.role === ROLES.SUPER_ADMIN || user?.role === ROLES.PLATFORM_ADMIN;

const serializeTicket = (ticket, messages = undefined) => ({
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
  ...(messages ? { messages } : {}),
});

const serializeMessage = (row) => ({
  id: row.id,
  ticketId: row.ticketId,
  userId: row.userId,
  authorRole: row.authorRole,
  authorName: row.authorName || '',
  body: row.body,
  createdAt: row.createdAt,
});

const assertCanAccess = (user, ticket) => {
  if (isPlatform(user)) return;
  if (ticket.userId === user.id) return;
  if (user.tenantId && ticket.tenantId === user.tenantId) return;
  throw new ForbiddenError('You cannot open this ticket');
};

const seedOpeningMessage = async (ticket) => {
  if (!ticket?.message) return;
  await SupportModel.createMessage({
    ticketId: ticket.id,
    userId: ticket.userId,
    authorRole: 'OWNER',
    authorName: ticket.senderName || ticket.user?.name || 'Gym owner',
    body: ticket.message,
  });
};

const loadMessages = async (ticket) => {
  let rows = await SupportModel.listMessages(ticket.id);
  if (!rows.length && ticket.message) {
    await seedOpeningMessage(ticket);
    rows = await SupportModel.listMessages(ticket.id);
  }
  return rows.map(serializeMessage);
};

export const create = async (user, body) => {
  if (isPlatform(user)) {
    throw new ForbiddenError('Platform admins reply to tickets; they do not open them');
  }

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

  await seedOpeningMessage(ticket);

  const tenant = user.tenantId
    ? asDoc(await Tenant.findOne({ _id: user.tenantId, ...notDeleted }).select('name email'))
    : null;

  try {
    const mailResult = await EmailService.sendSupportTicketEmail({ ticket, tenant, user });
    if (mailResult.delivered) {
      ticket = await SupportModel.update(ticket.id, { emailSent: true });
    }
  } catch (err) {
    logger.warn('Support ticket email failed', { ticketId: ticket.id, err: err.message });
  }

  return serializeTicket(ticket, await loadMessages(ticket));
};

export const list = async (user, query) => {
  const page = query.page || 1;
  const limit = Math.min(query.limit || 20, 100);
  const skip = (page - 1) * limit;

  const where = {};
  if (!isPlatform(user)) {
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
    Object.assign(where, textSearch(query.search.trim(), ['subject', 'message', 'senderEmail', 'senderName']));
  }

  const [tickets, total] = await Promise.all([
    SupportModel.list({ where, skip, take: limit }),
    SupportModel.count(where),
  ]);

  return {
    tickets: tickets.map((ticket) => serializeTicket(ticket)),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
  };
};

export const getById = async (user, ticketId) => {
  const ticket = await SupportModel.findById(ticketId);
  if (!ticket) throw new NotFoundError('Support ticket not found');
  assertCanAccess(user, ticket);
  return serializeTicket(ticket, await loadMessages(ticket));
};

export const reply = async (user, ticketId, body) => {
  const ticket = await SupportModel.findById(ticketId);
  if (!ticket) throw new NotFoundError('Support ticket not found');
  assertCanAccess(user, ticket);

  if (ticket.status === 'CLOSED' && !isPlatform(user)) {
    throw new BadRequestError('This ticket is closed');
  }

  const text = String(body.message || '').trim();
  if (text.length < 1) throw new BadRequestError('Message is required');

  await loadMessages(ticket);

  const authorRole = isPlatform(user) ? 'ADMIN' : 'OWNER';
  const authorName = [user.firstName, user.lastName].filter(Boolean).join(' ') || (isPlatform(user) ? 'Support' : 'Gym owner');

  await SupportModel.createMessage({
    ticketId: ticket.id,
    userId: user.id,
    authorRole,
    authorName,
    body: text,
  });

  let nextStatus = ticket.status;
  if (isPlatform(user) && body.status) {
    nextStatus = body.status;
  } else if (isPlatform(user) && ticket.status === 'OPEN') {
    nextStatus = 'IN_PROGRESS';
  } else if (!isPlatform(user) && (ticket.status === 'RESOLVED' || ticket.status === 'CLOSED')) {
    nextStatus = 'OPEN';
  }

  if (nextStatus !== ticket.status) {
    await SupportModel.update(ticketId, { status: nextStatus });
  }

  return getById(user, ticketId);
};

export const updateStatus = async (user, ticketId, status) => {
  if (!isPlatform(user)) {
    throw new ForbiddenError('Only platform admins can update ticket status');
  }

  const existing = await SupportModel.findById(ticketId);
  if (!existing) throw new NotFoundError('Support ticket not found');

  const ticket = await SupportModel.update(ticketId, { status });
  return serializeTicket(ticket, await loadMessages(ticket));
};
