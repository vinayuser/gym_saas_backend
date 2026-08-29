import prisma from '../config/database.js';

const ticketInclude = {
  tenant: { select: { id: true, name: true, email: true } },
  user: { select: { id: true, email: true, firstName: true, lastName: true, role: true } },
};

export const create = (data) =>
  prisma.supportTicket.create({
    data,
    include: ticketInclude,
  });

export const findById = (id) =>
  prisma.supportTicket.findUnique({
    where: { id },
    include: ticketInclude,
  });

export const update = (id, data) =>
  prisma.supportTicket.update({
    where: { id },
    data,
    include: ticketInclude,
  });

export const list = ({ where, skip, take }) =>
  prisma.supportTicket.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    skip,
    take,
    include: ticketInclude,
  });

export const count = (where) => prisma.supportTicket.count({ where });
