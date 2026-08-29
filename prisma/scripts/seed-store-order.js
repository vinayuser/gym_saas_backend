/**
 * Seed a demo store order for an existing member (Fitness Gym by default).
 * Usage: node prisma/scripts/seed-store-order.js
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const gym = await prisma.gym.findFirst({
    where: { name: { contains: 'Fitness', mode: 'insensitive' } },
  });
  if (!gym) {
    console.error('No Fitness Gym found');
    process.exit(1);
  }

  const member = await prisma.member.findFirst({
    where: { gymId: gym.id, deletedAt: null },
    orderBy: { joinedAt: 'asc' },
  });
  if (!member) {
    console.error('No member found for gym');
    process.exit(1);
  }

  const product = await prisma.product.findFirst({
    where: { gymId: gym.id, deletedAt: null, isActive: true, stockQty: { gt: 0 } },
  });
  if (!product) {
    console.error('No product with stock found');
    process.exit(1);
  }

  const existing = await prisma.sale.findFirst({
    where: { gymId: gym.id, memberId: member.id },
  });
  if (existing) {
    console.log('Demo order already exists:', existing.orderNumber || existing.id);
    return;
  }

  const qty = 1;
  const unitPrice = Number(product.price);
  const total = unitPrice * qty;
  const orderNumber = `ORD-${String((await prisma.sale.count({ where: { gymId: gym.id } })) + 1).padStart(4, '0')}`;

  const order = await prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: { id: product.id },
      data: { stockQty: { decrement: qty } },
    });

    return tx.sale.create({
      data: {
        gymId: gym.id,
        memberId: member.id,
        orderNumber,
        totalAmount: total,
        status: 'COMPLETED',
        fulfillmentStatus: 'CONFIRMED',
        fulfillmentType: 'PICKUP',
        notes: 'Demo order — member will collect from front desk.',
        items: {
          create: {
            productId: product.id,
            quantity: qty,
            unitPrice,
            total,
          },
        },
      },
      include: {
        member: { select: { firstName: true, lastName: true, memberCode: true } },
        items: { include: { product: { select: { name: true } } } },
      },
    });
  });

  console.log('Created demo store order:');
  console.log(`  Order: ${order.orderNumber}`);
  console.log(`  Member: ${order.member.firstName} ${order.member.lastName} (${order.member.memberCode})`);
  console.log(`  Product: ${order.items[0].product.name} × ${order.items[0].quantity}`);
  console.log(`  Total: ₹${total}`);
  console.log(`  Status: ${order.fulfillmentStatus} — pickup at gym`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
