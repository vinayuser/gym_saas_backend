import prisma from '../config/database.js';
import * as GymModel from '../models/GymModel.js';
import { NotFoundError } from '../utils/errors.js';
import { parsePagination, buildPaginationMeta } from '../utils/response.js';

const validateGym = async (tenantId, gymId) => {
  const gym = await GymModel.findById(gymId, tenantId);
  if (!gym) throw new NotFoundError('Gym not found');
  return gym;
};

const parseCategory = (query) => {
  const raw = (query?.category || 'ALL').toUpperCase();
  if (['ALL', 'SUBSCRIPTIONS', 'STORE_SALES', 'INVOICES'].includes(raw)) return raw;
  return 'ALL';
};

const isFinanceExport = (query) => query?.export === true || query?.export === 'true' || query?.export === '1';

const paginateList = (items, query) => {
  const total = items.length;
  if (isFinanceExport(query)) {
    return {
      items,
      pagination: buildPaginationMeta(total, 1, total || 1),
    };
  }
  const pagination = parsePagination(query);
  return {
    items: items.slice(pagination.skip, pagination.skip + pagination.limit),
    pagination: buildPaginationMeta(total, pagination.page, pagination.limit),
  };
};

const num = (v) => Number(v || 0);

const gstFromAmount = (amount, rate = 0.18) => Math.round(amount * rate * 100) / 100;

const saleWhere = (gymId) => ({
  gymId,
  status: 'COMPLETED',
  fulfillmentStatus: { not: 'CANCELLED' },
});

const fetchSubscriptionEntries = async (gymId) => {
  const payments = await prisma.memberPayment.findMany({
    where: { membership: { gymId } },
    include: { membership: { include: { member: true, plan: true } } },
    orderBy: { createdAt: 'desc' },
  });

  const paymentEntries = payments.map((p) => ({
    id: p.id,
    source: 'SUBSCRIPTIONS',
    date: p.paidAt || p.createdAt,
    label: `${p.membership?.plan?.name || 'Membership'} — ${p.membership?.member?.firstName || ''} ${p.membership?.member?.lastName || ''}`.trim(),
    refId: p.providerRef || p.id.slice(0, 8).toUpperCase(),
    amount: num(p.amount),
    status: p.status,
    method: p.method || 'UPI',
    memberName: p.membership?.member
      ? `${p.membership.member.firstName} ${p.membership.member.lastName}`.trim()
      : null,
    memberCode: p.membership?.member?.memberCode,
    planName: p.membership?.plan?.name,
    type: 'payment',
  }));

  const membershipsWithoutPayments = await prisma.membership.findMany({
    where: {
      gymId,
      amountPaid: { not: null },
      payments: { none: {} },
    },
    include: { member: true, plan: true },
  });

  const syntheticEntries = membershipsWithoutPayments.map((m) => ({
    id: `membership-${m.id}`,
    source: 'SUBSCRIPTIONS',
    date: m.createdAt,
    label: `${m.plan?.name || 'Membership'} — ${m.member.firstName} ${m.member.lastName}`.trim(),
    refId: m.member.memberCode,
    amount: num(m.amountPaid),
    status: 'COMPLETED',
    method: 'CASH',
    memberName: `${m.member.firstName} ${m.member.lastName}`.trim(),
    memberCode: m.member.memberCode,
    planName: m.plan?.name,
    type: 'membership',
  }));

  return [...paymentEntries, ...syntheticEntries];
};

const fetchStoreEntries = async (gymId) => {
  const sales = await prisma.sale.findMany({
    where: saleWhere(gymId),
    include: {
      member: { select: { firstName: true, lastName: true, memberCode: true } },
      items: { include: { product: { select: { name: true } } } },
    },
    orderBy: { soldAt: 'desc' },
  });

  return sales.map((s) => ({
    id: s.id,
    source: 'STORE_SALES',
    date: s.soldAt,
    label: `Store order ${s.orderNumber || s.id.slice(0, 8).toUpperCase()}${s.member ? ` — ${s.member.firstName} ${s.member.lastName}` : ''}`,
    refId: s.orderNumber || s.id.slice(0, 8).toUpperCase(),
    amount: num(s.totalAmount),
    status: s.fulfillmentStatus,
    method: 'STORE',
    memberName: s.member ? `${s.member.firstName} ${s.member.lastName}`.trim() : 'Walk-in',
    memberCode: s.member?.memberCode,
    planName: null,
    type: 'store_order',
    itemCount: s.items?.reduce((sum, i) => sum + i.quantity, 0) ?? 0,
    products: s.items?.map((i) => i.product?.name).filter(Boolean),
  }));
};

const fetchInvoiceEntries = async (gymId) => {
  const invoices = await prisma.invoice.findMany({
    where: { gymId },
    orderBy: { createdAt: 'desc' },
  });

  return invoices.map((i) => ({
    id: i.id,
    source: 'INVOICES',
    date: i.paidAt || i.issuedAt || i.createdAt,
    label: `Invoice ${i.invoiceNumber}`,
    refId: i.invoiceNumber,
    amount: num(i.totalAmount),
    status: i.status,
    method: 'INVOICE',
    memberName: null,
    memberCode: null,
    planName: null,
    type: 'invoice',
  }));
};

const filterByCategory = (entries, category) => {
  if (category === 'ALL') return entries;
  return entries.filter((e) => e.source === category);
};

const completedAmount = (entries) =>
  entries
    .filter((e) => e.status === 'COMPLETED' || e.status === 'PAID' || e.status === 'COLLECTED' || e.type === 'store_order' || e.type === 'membership')
    .reduce((s, e) => s + e.amount, 0);

const pendingAmount = (entries) =>
  entries
    .filter((e) => ['PENDING', 'ISSUED', 'DRAFT', 'PLACED', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP'].includes(e.status))
    .reduce((s, e) => s + e.amount, 0);

const buildWeeklyTrend = (entries, weeks = 8) => {
  const now = new Date();
  const buckets = [];

  for (let i = weeks - 1; i >= 0; i -= 1) {
    const start = new Date(now);
    start.setDate(start.getDate() - i * 7);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);

    const total = entries
      .filter((e) => {
        const d = new Date(e.date);
        return d >= start && d < end;
      })
      .reduce((s, e) => s + e.amount, 0);

    buckets.push({
      label: `W${weeks - i}`,
      amount: total,
    });
  }

  const max = Math.max(...buckets.map((b) => b.amount), 1);
  return buckets.map((b) => ({ ...b, pct: Math.round((b.amount / max) * 100) }));
};

export const overview = async (tenantId, gymId, query = {}) => {
  await validateGym(tenantId, gymId);
  const category = parseCategory(query);

  const [subscriptions, store, invoices] = await Promise.all([
    fetchSubscriptionEntries(gymId),
    fetchStoreEntries(gymId),
    fetchInvoiceEntries(gymId),
  ]);

  const allEntries = [...subscriptions, ...store, ...invoices];
  const filtered = filterByCategory(allEntries, category);

  const subscriptionRevenue = completedAmount(subscriptions);
  const storeRevenue = completedAmount(store);
  const invoiceRevenue = invoices.filter((i) => i.status === 'PAID').reduce((s, i) => s + i.amount, 0);

  const totalRevenue =
    category === 'SUBSCRIPTIONS'
      ? subscriptionRevenue
      : category === 'STORE_SALES'
        ? storeRevenue
        : category === 'INVOICES'
          ? invoiceRevenue
          : subscriptionRevenue + storeRevenue + invoiceRevenue;

  const pending = pendingAmount(filtered);
  const overdue = invoices
    .filter((i) => i.status === 'OVERDUE')
    .reduce((s, i) => s + i.amount, 0);

  const recent = [...filtered]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 10)
    .map((e) => ({
      id: e.id,
      type: e.type,
      source: e.source,
      label: e.label,
      amount: e.amount,
      status: e.status,
      at: e.date,
    }));

  return {
    category,
    totalRevenue,
    subscriptionRevenue,
    storeRevenue,
    invoiceRevenue,
    pendingAmount: pending,
    overdueAmount: overdue,
    pendingCount: filtered.filter((e) =>
      ['PENDING', 'ISSUED', 'DRAFT', 'PLACED', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP'].includes(e.status)
    ).length,
    overdueCount: invoices.filter((i) => i.status === 'OVERDUE').length,
    orderCount: store.length,
    subscriptionCount: subscriptions.length,
    trend: buildWeeklyTrend(filtered),
    recent,
  };
};

export const ledger = async (tenantId, gymId, query) => {
  await validateGym(tenantId, gymId);
  const category = parseCategory(query);

  const [subscriptions, store, invoices] = await Promise.all([
    fetchSubscriptionEntries(gymId),
    fetchStoreEntries(gymId),
    fetchInvoiceEntries(gymId),
  ]);

  const entries = filterByCategory([...subscriptions, ...store, ...invoices], category)
    .map((e) => {
      const isCredit =
        e.status === 'COMPLETED' ||
        e.status === 'PAID' ||
        e.status === 'COLLECTED' ||
        e.type === 'store_order' ||
        e.type === 'membership';
      return {
        id: e.id,
        date: e.date,
        narration: e.label,
        refId: e.refId,
        debit: isCredit ? 0 : e.amount,
        credit: isCredit ? e.amount : 0,
        gst: gstFromAmount(isCredit ? e.amount : 0),
        method: e.method,
        category: e.source,
        status: e.status,
      };
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const { items, pagination } = paginateList(entries, query);

  return {
    entries: items,
    category,
    pagination,
  };
};

export const payments = async (tenantId, gymId, query) => {
  await validateGym(tenantId, gymId);
  const category = parseCategory(query);

  const [subscriptions, store] = await Promise.all([
    fetchSubscriptionEntries(gymId),
    fetchStoreEntries(gymId),
  ]);

  let rows = [];

  if (category === 'ALL' || category === 'SUBSCRIPTIONS') {
    const memberships = await prisma.membership.findMany({
      where: { gymId },
      include: {
        member: true,
        plan: true,
        payments: { orderBy: { createdAt: 'desc' } },
      },
    });

    rows.push(
      ...memberships.map((m) => ({
        id: m.id,
        source: 'SUBSCRIPTIONS',
        memberId: m.memberId,
        memberName: `${m.member.firstName} ${m.member.lastName}`.trim(),
        memberCode: m.member.memberCode,
        planName: m.plan.name,
        status: m.status,
        balance: m.payments
          .filter((p) => p.status !== 'COMPLETED')
          .reduce((s, p) => s + num(p.amount), 0),
        totalPaid:
          m.payments.filter((p) => p.status === 'COMPLETED').reduce((s, p) => s + num(p.amount), 0) ||
          num(m.amountPaid),
        payments: m.payments.map((p) => ({
          ...p,
          amount: num(p.amount),
        })),
      }))
    );
  }

  if (category === 'ALL' || category === 'STORE_SALES') {
    rows.push(
      ...store.map((s) => ({
        id: s.id,
        source: 'STORE_SALES',
        memberId: null,
        memberName: s.memberName,
        memberCode: s.memberCode,
        planName: s.products?.join(', ') || 'Store purchase',
        status: s.status,
        balance: ['PLACED', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP'].includes(s.status) ? s.amount : 0,
        totalPaid: s.amount,
        payments: [
          {
            id: s.id,
            amount: s.amount,
            status: 'COMPLETED',
            method: 'STORE',
            paidAt: s.date,
            createdAt: s.date,
          },
        ],
      }))
    );
  }

  if (category === 'INVOICES') {
    const invoiceEntries = await fetchInvoiceEntries(gymId);
    rows.push(
      ...invoiceEntries.map((i) => ({
        id: i.id,
        source: 'INVOICES',
        memberId: null,
        memberName: i.label,
        memberCode: i.refId,
        planName: 'Invoice',
        status: i.status,
        balance: i.status === 'PAID' ? 0 : i.amount,
        totalPaid: i.status === 'PAID' ? i.amount : 0,
        payments: [
          {
            id: i.id,
            amount: i.amount,
            status: i.status,
            method: 'INVOICE',
            paidAt: i.status === 'PAID' ? i.date : null,
            createdAt: i.date,
          },
        ],
      }))
    );
  }

  rows.sort((a, b) => {
    const aDate = a.payments?.[0]?.paidAt || a.payments?.[0]?.createdAt;
    const bDate = b.payments?.[0]?.paidAt || b.payments?.[0]?.createdAt;
    return new Date(bDate) - new Date(aDate);
  });

  const { items, pagination } = paginateList(rows, query);

  return {
    rows: items,
    category,
    pagination,
  };
};

export const expenses = async (tenantId, gymId, query = {}) => {
  await validateGym(tenantId, gymId);
  const category = parseCategory(query);

  const overviewData = await overview(tenantId, gymId, query);
  const revenue = overviewData.totalRevenue;

  const expensesBySource = {
    equipment: Math.round(revenue * 0.29),
    salaries: Math.round(revenue * 0.45),
    rent: Math.round(revenue * 0.12),
    vendors: Math.round(revenue * 0.07),
  };
  const totalExpenses = Object.values(expensesBySource).reduce((a, b) => a + b, 0);
  const netMargin = revenue > 0 ? Math.round(((revenue - totalExpenses) / revenue) * 1000) / 10 : 0;

  return {
    category,
    revenue,
    subscriptionRevenue: overviewData.subscriptionRevenue,
    storeRevenue: overviewData.storeRevenue,
    expenses: expensesBySource,
    totalExpenses,
    netMargin,
    isEstimated: true,
  };
};

export const reports = async (tenantId, gymId, query = {}) => {
  await validateGym(tenantId, gymId);
  const category = parseCategory(query);
  const overviewData = await overview(tenantId, gymId, { category: 'ALL' });

  const breakdown = [
    { label: 'Subscriptions & memberships', amount: overviewData.subscriptionRevenue, source: 'SUBSCRIPTIONS' },
    { label: 'Store sales & orders', amount: overviewData.storeRevenue, source: 'STORE_SALES' },
    { label: 'Invoices & billing', amount: overviewData.invoiceRevenue, source: 'INVOICES' },
  ].filter((b) => (category === 'ALL' ? true : b.source === category));

  const totalRevenue = breakdown.reduce((s, b) => s + b.amount, 0);
  const vat = Math.round(totalRevenue * 0.18 * 100) / 100;
  const netProfit = Math.round(totalRevenue * 0.338 * 100) / 100;

  return {
    category,
    totalRevenue,
    breakdown,
    netProfit,
    marginPct: totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 1000) / 10 : 0,
    vat,
    subscriptionRevenue: overviewData.subscriptionRevenue,
    storeRevenue: overviewData.storeRevenue,
  };
};
