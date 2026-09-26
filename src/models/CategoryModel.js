import prisma from '../config/database.js';

export const findMany = (gymId, { skip = 0, take = 10 } = {}) =>
  Promise.all([
    prisma.productCategory.findMany({
      where: { gymId },
      orderBy: { name: 'asc' },
      skip,
      take,
      include: { _count: { select: { products: true } } },
    }),
    prisma.productCategory.count({ where: { gymId } }),
  ]);

export const findById = (id, gymId) =>
  prisma.productCategory.findFirst({
    where: { id, gymId },
    include: { _count: { select: { products: true } } },
  });

export const create = (data) => prisma.productCategory.create({ data });
export const update = (id, data) => prisma.productCategory.update({ where: { id }, data });
export const remove = (id) => prisma.productCategory.delete({ where: { id } });
