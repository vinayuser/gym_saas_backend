import prisma from '../config/database.js';

export const findMany = (tenantId, gymId, { status }) => {
  const where = {
    tenantId,
    ...(gymId ? { gymId } : {}),
    ...(status ? { status } : {}),
  };
  return prisma.enquiry.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      assignedTo: { select: { id: true, firstName: true, lastName: true } },
    },
  });
};

export const findById = (id, tenantId) =>
  prisma.enquiry.findFirst({
    where: { id, tenantId },
    include: { assignedTo: { select: { id: true, firstName: true, lastName: true } } },
  });

export const create = (data) => prisma.enquiry.create({ data });
export const update = (id, data) => prisma.enquiry.update({ where: { id }, data });
export const remove = (id) => prisma.enquiry.delete({ where: { id } });

export const countByStatus = (tenantId, gymId) =>
  prisma.enquiry.groupBy({
    by: ['status'],
    where: { tenantId, ...(gymId ? { gymId } : {}) },
    _count: true,
  });
