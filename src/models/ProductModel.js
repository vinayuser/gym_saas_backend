import prisma from '../config/database.js';

export const findMany = (gymId, { skip, limit, search, categoryId, lowStock }) => {
  const where = {
    gymId,
    deletedAt: null,
    ...(categoryId ? { categoryId } : {}),
    ...(lowStock ? { stockQty: { lte: 5 } } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { sku: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  return Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take: limit,
      orderBy: { name: 'asc' },
      include: { category: true },
    }),
    prisma.product.count({ where }),
  ]);
};

export const findById = (id, gymId) =>
  prisma.product.findFirst({
    where: { id, gymId, deletedAt: null },
    include: { category: true },
  });

export const create = (data) => prisma.product.create({ data });
export const update = (id, data) => prisma.product.update({ where: { id }, data });
export const softDelete = (id) =>
  prisma.product.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });

export const stats = async (gymId) => {
  const products = await prisma.product.findMany({
    where: { gymId, deletedAt: null, isActive: true },
    select: { price: true, stockQty: true, lowStockAt: true },
  });
  const lowStock = products.filter((p) => p.stockQty <= (p.lowStockAt || 5)).length;
  const sales = await prisma.sale.aggregate({
    where: { gymId },
    _sum: { totalAmount: true },
    _count: true,
  });
  return { lowStock, totalRevenue: sales._sum.totalAmount, salesCount: sales._count };
};
