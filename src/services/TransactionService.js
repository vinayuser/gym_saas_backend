import prisma from '../config/database.js';
import { parsePagination, buildPaginationMeta } from '../utils/response.js';

const paymentInclude = {
  subscription: {
    include: {
      plan: {
        select: {
          id: true,
          name: true,
          type: true,
          priceMonthly: true,
        },
      },
      tenant: {
        select: {
          id: true,
          name: true,
          email: true,
          slug: true,
          owner: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          gymInvites: {
            where: { status: 'ACCEPTED' },
            orderBy: { acceptedAt: 'desc' },
            take: 1,
            select: {
              id: true,
              email: true,
              businessName: true,
              token: true,
              razorpayOrderId: true,
              razorpayPaymentId: true,
              acceptedAt: true,
            },
          },
        },
      },
    },
  },
};

const serializeTransaction = (payment) => {
  const tenant = payment.subscription?.tenant;
  const invite = tenant?.gymInvites?.[0] || null;
  const owner = tenant?.owner;

  return {
    id: payment.id,
    amount: payment.amount,
    currency: payment.currency,
    status: payment.status,
    provider: payment.provider,
    providerRef: payment.providerRef,
    paidAt: payment.paidAt,
    createdAt: payment.createdAt,
    subscriptionId: payment.subscriptionId,
    subscriptionStatus: payment.subscription?.status,
    plan: payment.subscription?.plan
      ? {
          id: payment.subscription.plan.id,
          name: payment.subscription.plan.name,
          type: payment.subscription.plan.type,
        }
      : null,
    tenant: tenant
      ? {
          id: tenant.id,
          name: tenant.name,
          email: tenant.email,
          slug: tenant.slug,
        }
      : null,
    owner: owner
      ? {
          id: owner.id,
          email: owner.email,
          name: [owner.firstName, owner.lastName].filter(Boolean).join(' ') || owner.email,
        }
      : null,
    invite: invite
      ? {
          id: invite.id,
          email: invite.email,
          businessName: invite.businessName,
          token: invite.token,
          acceptedAt: invite.acceptedAt,
          razorpayOrderId: invite.razorpayOrderId,
          razorpayPaymentId: invite.razorpayPaymentId,
        }
      : null,
    razorpayOrderId: invite?.razorpayOrderId || null,
    razorpayPaymentId: payment.providerRef || invite?.razorpayPaymentId || null,
  };
};

export const listTransactions = async (query) => {
  const pagination = parsePagination(query);
  const search = query.search?.trim();

  const where = {};
  if (query.status && query.status !== 'ALL') {
    where.status = query.status;
  }

  if (search) {
    where.OR = [
      { providerRef: { contains: search, mode: 'insensitive' } },
      { provider: { contains: search, mode: 'insensitive' } },
      {
        subscription: {
          tenant: {
            name: { contains: search, mode: 'insensitive' },
          },
        },
      },
      {
        subscription: {
          tenant: {
            email: { contains: search, mode: 'insensitive' },
          },
        },
      },
      {
        subscription: {
          tenant: {
            owner: {
              email: { contains: search, mode: 'insensitive' },
            },
          },
        },
      },
      {
        subscription: {
          plan: {
            name: { contains: search, mode: 'insensitive' },
          },
        },
      },
    ];
  }

  const [payments, total, completedAgg, statusGroups] = await Promise.all([
    prisma.saasPayment.findMany({
      where,
      include: paymentInclude,
      orderBy: { createdAt: 'desc' },
      skip: (pagination.page - 1) * pagination.limit,
      take: pagination.limit,
    }),
    prisma.saasPayment.count({ where }),
    prisma.saasPayment.aggregate({
      where: { status: 'COMPLETED' },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.saasPayment.groupBy({
      by: ['status'],
      _count: { _all: true },
    }),
  ]);

  const countForGroup = (g) => g._count?._all ?? g._count ?? 0;
  const statusCounts = Object.fromEntries(statusGroups.map((g) => [g.status, countForGroup(g)]));

  return {
    transactions: payments.map(serializeTransaction),
    summary: {
      totalRevenue: completedAgg._sum.amount ?? 0,
      completedCount: completedAgg._count,
      pendingCount: statusCounts.PENDING || 0,
      failedCount: statusCounts.FAILED || 0,
      refundedCount: statusCounts.REFUNDED || 0,
      totalCount: statusGroups.reduce((sum, g) => sum + countForGroup(g), 0),
    },
    pagination: buildPaginationMeta(total, pagination.page, pagination.limit),
  };
};

export const getTransactionById = async (id) => {
  const payment = await prisma.saasPayment.findUnique({
    where: { id },
    include: paymentInclude,
  });

  if (!payment) return null;
  return serializeTransaction(payment);
};
