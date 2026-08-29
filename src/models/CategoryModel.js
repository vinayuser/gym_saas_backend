import prisma from '../config/database.js';

export const findMany = (gymId) =>
  prisma.productCategory.findMany({
    where: { gymId },
    orderBy: { name: 'asc' },
    include: { _count: { select: { products: true } } },
  });

export const findById = (id, gymId) =>
  prisma.productCategory.findFirst({
    where: { id, gymId },
    include: { _count: { select: { products: true } } },
  });

export const create = (data) => prisma.productCategory.create({ data });
export const update = (id, data) => prisma.productCategory.update({ where: { id }, data });
export const remove = (id) => prisma.productCategory.delete({ where: { id } });
