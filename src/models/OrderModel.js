import prisma from '../config/database.js';

const orderInclude = {
  member: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      memberCode: true,
      phone: true,
    },
  },
  items: {
    include: {
      product: {
        select: { id: true, name: true, sku: true, images: true, price: true },
      },
    },
  },
};

export const findMany = (gymId, { skip, limit, fulfillmentStatus, memberId }) => {
  const where = {
    gymId,
    ...(fulfillmentStatus ? { fulfillmentStatus } : {}),
    ...(memberId ? { memberId } : {}),
  };

  return Promise.all([
    prisma.sale.findMany({
      where,
      skip,
      take: limit,
      orderBy: { soldAt: 'desc' },
      include: orderInclude,
    }),
    prisma.sale.count({ where }),
  ]);
};

export const findById = (id, gymId) =>
  prisma.sale.findFirst({
    where: { id, gymId },
    include: orderInclude,
  });

export const stats = (gymId) =>
  prisma.sale.aggregate({
    where: { gymId },
    _sum: { totalAmount: true, taxAmount: true },
    _count: true,
  });

export const fulfillmentStats = async (gymId) => {
  const rows = await prisma.sale.groupBy({
    by: ['fulfillmentStatus'],
    where: { gymId },
    _count: true,
  });
  return rows.reduce((acc, row) => {
    acc[row.fulfillmentStatus] = row._count;
    return acc;
  }, {});
};

const nextOrderNumber = async (gymId) => {
  const count = await prisma.sale.count({ where: { gymId } });
  const seq = String(count + 1).padStart(4, '0');
  return `ORD-${seq}`;
};

export const create = async ({ gymId, memberId, items, notes, fulfillmentType, status }) => {
  const productIds = items.map((i) => i.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, gymId, deletedAt: null, isActive: true },
  });

  if (products.length !== productIds.length) {
    throw new Error('PRODUCT_NOT_FOUND');
  }

  const productMap = new Map(products.map((p) => [p.id, p]));
  let totalAmount = 0;
  const lineItems = items.map((item) => {
    const product = productMap.get(item.productId);
    if (product.stockQty < item.quantity) {
      throw new Error('INSUFFICIENT_STOCK');
    }
    const unitPrice = Number(product.price);
    const total = unitPrice * item.quantity;
    totalAmount += total;
    return { productId: item.productId, quantity: item.quantity, unitPrice, total };
  });

  const orderNumber = await nextOrderNumber(gymId);

  return prisma.$transaction(async (tx) => {
    for (const item of lineItems) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stockQty: { decrement: item.quantity } },
      });
    }

    return tx.sale.create({
      data: {
        gymId,
        memberId,
        orderNumber,
        totalAmount,
        taxAmount: null,
        status: status || 'COMPLETED',
        fulfillmentStatus: 'PLACED',
        fulfillmentType: fulfillmentType || 'PICKUP',
        notes: notes || null,
        items: { create: lineItems },
      },
      include: orderInclude,
    });
  });
};

export const updateFulfillment = (id, { fulfillmentStatus, notes }) =>
  prisma.sale.update({
    where: { id },
    data: {
      fulfillmentStatus,
      ...(notes !== undefined && { notes }),
      ...(fulfillmentStatus === 'COLLECTED' && { collectedAt: new Date() }),
    },
    include: orderInclude,
  });

export const findByMember = (gymId, memberId, { skip, limit }) =>
  Promise.all([
    prisma.sale.findMany({
      where: { gymId, memberId },
      skip,
      take: limit,
      orderBy: { soldAt: 'desc' },
      include: orderInclude,
    }),
    prisma.sale.count({ where: { gymId, memberId } }),
  ]);
