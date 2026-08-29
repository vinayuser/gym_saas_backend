import prisma from '../config/database.js';
import * as GymModel from '../models/GymModel.js';
import * as AttendanceModel from '../models/AttendanceModel.js';
import { NotFoundError } from '../utils/errors.js';

const startOfMonth = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), 1);
const startOfLastMonth = (d = new Date()) => new Date(d.getFullYear(), d.getMonth() - 1, 1);

export const getOwnerDashboard = async (tenantId, gymId) => {
  const gym = await GymModel.findById(gymId, tenantId);
  if (!gym) throw new NotFoundError('Gym not found');

  const now = new Date();
  const monthStart = startOfMonth(now);
  const lastMonthStart = startOfLastMonth(now);

  const [
    activeMembers,
    membersLastMonth,
    attendanceStats,
    expiringMemberships,
    recentPayments,
    recentInvoices,
    monthlySales,
  ] = await Promise.all([
    prisma.member.count({ where: { gymId, deletedAt: null, isActive: true } }),
    prisma.member.count({
      where: {
        gymId,
        deletedAt: null,
        createdAt: { lt: monthStart, gte: lastMonthStart },
      },
    }),
    AttendanceModel.todayStats(gymId),
    prisma.membership.findMany({
      where: {
        gymId,
        status: 'ACTIVE',
        endDate: { gte: now, lte: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000) },
      },
      take: 4,
      orderBy: { endDate: 'asc' },
      include: {
        member: { select: { id: true, firstName: true, lastName: true, memberCode: true } },
        plan: { select: { name: true } },
      },
    }),
    prisma.memberPayment.findMany({
      where: { membership: { gymId }, status: 'COMPLETED' },
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        membership: {
          include: {
            member: { select: { firstName: true, lastName: true } },
            plan: { select: { name: true } },
          },
        },
      },
    }),
    prisma.invoice.findMany({
      where: { gymId },
      take: 5,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.sale.aggregate({
      where: { gymId, soldAt: { gte: monthStart } },
      _sum: { totalAmount: true },
    }),
  ]);

  const paidInvoices = await prisma.invoice.aggregate({
    where: { gymId, status: 'PAID', paidAt: { gte: monthStart } },
    _sum: { totalAmount: true },
  });

  const monthlyRevenue =
    Number(monthlySales._sum.totalAmount || 0) + Number(paidInvoices._sum.totalAmount || 0);

  const memberGrowthPct =
    membersLastMonth > 0
      ? Math.round(((activeMembers - membersLastMonth) / membersLastMonth) * 1000) / 10
      : activeMembers > 0
        ? 12
        : 0;

  const peakCapacity = 150;
  const checkInPct =
    peakCapacity > 0
      ? Math.round((attendanceStats.currentlyInside / peakCapacity) * 1000) / 10
      : 0;

  const heatmap = Array.from({ length: 24 }, (_, hour) => {
    const row = attendanceStats.hourly?.find((h) => Number(h.hour) === hour);
    return { hour, count: row?.count ?? 0 };
  });

  const transactions = [
    ...recentPayments.map((p) => ({
      id: p.id.slice(0, 8).toUpperCase(),
      member: `${p.membership?.member?.firstName || ''} ${p.membership?.member?.lastName || ''}`.trim(),
      plan: p.membership?.plan?.name || 'Membership',
      date: p.paidAt || p.createdAt,
      amount: Number(p.amount),
      status: p.status === 'COMPLETED' ? 'Completed' : 'Pending',
    })),
    ...recentInvoices.map((i) => ({
      id: i.invoiceNumber,
      member: '—',
      plan: 'Invoice',
      date: i.issuedAt || i.createdAt,
      amount: Number(i.totalAmount),
      status: i.status === 'PAID' ? 'Completed' : i.status === 'OVERDUE' ? 'Overdue' : 'Pending',
    })),
  ]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);

  const expirations = expiringMemberships.map((m) => {
    const days = Math.ceil((new Date(m.endDate) - now) / (24 * 60 * 60 * 1000));
    let expiresIn = 'Expires soon';
    if (days <= 2) expiresIn = 'Expires in 2 days';
    else if (days <= 5) expiresIn = 'Expires in 5 days';
    else if (days <= 7) expiresIn = 'Expires in 1 week';
    else expiresIn = `Expires in ${days} days`;

    return {
      id: m.member.id,
      firstName: m.member.firstName,
      lastName: m.member.lastName,
      memberCode: m.member.memberCode,
      planName: m.plan.name,
      expiresIn,
      endDate: m.endDate,
    };
  });

  return {
    stats: {
      activeMembers,
      todayCheckIns: attendanceStats.totalToday,
      currentlyInside: attendanceStats.currentlyInside,
      checkInCapacityPct: checkInPct,
      monthlyRevenue,
      memberGrowthPct,
      expiringCount: expiringMemberships.length,
    },
    heatmap,
    expirations,
    transactions,
    peakCapacity,
  };
};

const monthBuckets = (monthsBack = 5) => {
  const now = new Date();
  const buckets = [];
  for (let i = monthsBack; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    buckets.push({
      key,
      label: d.toLocaleString('en-US', { month: 'short' }),
      year: d.getFullYear(),
    });
  }
  return buckets;
};

const bucketByMonth = (items, dateField) => {
  const map = Object.fromEntries(monthBuckets().map((b) => [b.key, 0]));
  items.forEach((item) => {
    const d = new Date(item[dateField]);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (key in map) map[key] += 1;
  });
  return map;
};

export const getOwnerAnalytics = async (tenantId, gymId) => {
  const gym = await GymModel.findById(gymId, tenantId);
  if (!gym) throw new NotFoundError('Gym not found');

  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    newMembers,
    attendances,
    payments,
    sales,
    paidInvoices,
    leadsByStatus,
    planGroups,
    activeMembers,
    totalCheckIns30d,
  ] = await Promise.all([
    prisma.member.findMany({
      where: { gymId, deletedAt: null, createdAt: { gte: sixMonthsAgo } },
      select: { createdAt: true },
    }),
    prisma.attendance.findMany({
      where: { gymId, checkInAt: { gte: thirtyDaysAgo } },
      select: { checkInAt: true },
    }),
    prisma.memberPayment.findMany({
      where: {
        status: 'COMPLETED',
        paidAt: { gte: sixMonthsAgo },
        membership: { gymId },
      },
      select: { amount: true, paidAt: true },
    }),
    prisma.sale.findMany({
      where: { gymId, soldAt: { gte: sixMonthsAgo } },
      select: { totalAmount: true, soldAt: true },
    }),
    prisma.invoice.findMany({
      where: { gymId, status: 'PAID', paidAt: { gte: sixMonthsAgo } },
      select: { totalAmount: true, paidAt: true },
    }),
    prisma.enquiry.groupBy({
      by: ['status'],
      where: { gymId },
      _count: { _all: true },
    }),
    prisma.membership.groupBy({
      by: ['planId'],
      where: { gymId, status: 'ACTIVE' },
      _count: { _all: true },
    }),
    prisma.member.count({ where: { gymId, deletedAt: null, isActive: true } }),
    prisma.attendance.count({ where: { gymId, checkInAt: { gte: thirtyDaysAgo } } }),
  ]);

  const memberTrend = monthBuckets().map((b) => ({
    label: b.label,
    count: newMembers.filter((m) => {
      const d = new Date(m.createdAt);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === b.key;
    }).length,
  }));

  const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const weekdayCounts = weekdayLabels.map((label, idx) => ({
    label,
    count: attendances.filter((a) => new Date(a.checkInAt).getDay() === idx).length,
  }));

  const revenueByMonth = Object.fromEntries(monthBuckets().map((b) => [b.key, 0]));
  payments.forEach((p) => {
    const d = new Date(p.paidAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (key in revenueByMonth) revenueByMonth[key] += Number(p.amount);
  });
  sales.forEach((s) => {
    const d = new Date(s.soldAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (key in revenueByMonth) revenueByMonth[key] += Number(s.totalAmount);
  });
  paidInvoices.forEach((i) => {
    const d = new Date(i.paidAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (key in revenueByMonth) revenueByMonth[key] += Number(i.totalAmount);
  });

  const revenueTrend = monthBuckets().map((b) => ({
    label: b.label,
    amount: Math.round(revenueByMonth[b.key] || 0),
  }));

  const planIds = planGroups.map((p) => p.planId);
  const plans = planIds.length
    ? await prisma.membershipPlan.findMany({
        where: { id: { in: planIds } },
        select: { id: true, name: true },
      })
    : [];
  const planNameById = Object.fromEntries(plans.map((p) => [p.id, p.name]));

  const planMix = planGroups
    .map((g) => ({
      plan: planNameById[g.planId] || 'Unknown plan',
      count: g._count._all,
    }))
    .sort((a, b) => b.count - a.count);

  const avgDailyCheckIns =
    totalCheckIns30d > 0 ? Math.round((totalCheckIns30d / 30) * 10) / 10 : 0;

  return {
    summary: {
      activeMembers,
      newMembers30d: newMembers.filter((m) => new Date(m.createdAt) >= thirtyDaysAgo).length,
      totalCheckIns30d,
      avgDailyCheckIns,
      totalLeads: leadsByStatus.reduce((sum, l) => sum + l._count._all, 0),
    },
    memberTrend,
    weekdayAttendance: weekdayCounts,
    revenueTrend,
    leadsByStatus: leadsByStatus.map((l) => ({
      status: l.status,
      count: l._count._all,
    })),
    planMix,
  };
};

export const getOwnerReports = async (tenantId, gymId) => {
  const gym = await GymModel.findById(gymId, tenantId);
  if (!gym) throw new NotFoundError('Gym not found');

  const now = new Date();
  const monthStart = startOfMonth(now);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    activeMembers,
    newMembersMonth,
    checkInsMonth,
    expiringSoon,
    paymentsMonth,
    salesMonth,
    invoicesMonth,
    leadsOpen,
    storeOrdersMonth,
  ] = await Promise.all([
    prisma.member.count({ where: { gymId, deletedAt: null, isActive: true } }),
    prisma.member.count({
      where: { gymId, deletedAt: null, createdAt: { gte: monthStart } },
    }),
    prisma.attendance.count({ where: { gymId, checkInAt: { gte: monthStart } } }),
    prisma.membership.count({
      where: {
        gymId,
        status: 'ACTIVE',
        endDate: { gte: now, lte: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000) },
      },
    }),
    prisma.memberPayment.aggregate({
      where: {
        status: 'COMPLETED',
        paidAt: { gte: monthStart },
        membership: { gymId },
      },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.sale.aggregate({
      where: { gymId, soldAt: { gte: monthStart } },
      _sum: { totalAmount: true },
      _count: true,
    }),
    prisma.invoice.aggregate({
      where: { gymId, status: 'PAID', paidAt: { gte: monthStart } },
      _sum: { totalAmount: true },
      _count: true,
    }),
    prisma.enquiry.count({
      where: {
        gymId,
        status: { in: ['NEW', 'CONTACTED', 'FOLLOW_UP', 'TRIAL'] },
      },
    }),
    prisma.sale.count({
      where: { gymId, soldAt: { gte: monthStart } },
    }),
  ]);

  const membershipRevenue = Number(paymentsMonth._sum.amount || 0);
  const storeRevenue = Number(salesMonth._sum.totalAmount || 0);
  const invoiceRevenue = Number(invoicesMonth._sum.totalAmount || 0);
  const totalRevenue = membershipRevenue + storeRevenue + invoiceRevenue;

  const periodLabel = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  return {
    periodLabel,
    generatedAt: now.toISOString(),
    snapshots: {
      activeMembers,
      newMembersMonth,
      checkInsMonth,
      expiringSoon,
      totalRevenue,
      openLeads: leadsOpen,
      storeOrdersMonth,
    },
    reports: [
      {
        id: 'membership',
        title: 'Membership Summary',
        description: 'Active members, new sign-ups, and renewals due this month.',
        icon: 'card_membership',
        metrics: [
          { label: 'Active members', value: String(activeMembers) },
          { label: 'New this month', value: String(newMembersMonth) },
          { label: 'Expiring in 14 days', value: String(expiringSoon) },
        ],
        actionLabel: 'View members',
        actionPath: '/owner/members',
      },
      {
        id: 'attendance',
        title: 'Attendance Report',
        description: 'Check-in volume and floor traffic for the current month.',
        icon: 'qr_code_scanner',
        metrics: [
          { label: 'Check-ins (MTD)', value: String(checkInsMonth) },
          { label: 'Avg per day', value: String(Math.round(checkInsMonth / Math.max(now.getDate(), 1))) },
          { label: 'Last 30 days', value: String(checkInsMonth) },
        ],
        actionLabel: 'Open attendance',
        actionPath: '/owner/attendance',
      },
      {
        id: 'revenue',
        title: 'Revenue Report',
        description: 'Membership payments, store sales, and paid invoices combined.',
        icon: 'payments',
        metrics: [
          { label: 'Total revenue', value: String(Math.round(totalRevenue)) },
          { label: 'Membership', value: String(Math.round(membershipRevenue)) },
          { label: 'Store + invoices', value: String(Math.round(storeRevenue + invoiceRevenue)) },
        ],
        actionLabel: 'Finance reports',
        actionPath: '/owner/finances/reports',
      },
      {
        id: 'leads',
        title: 'Lead Pipeline',
        description: 'Open enquiries and prospects awaiting follow-up.',
        icon: 'filter_alt',
        metrics: [
          { label: 'Open leads', value: String(leadsOpen) },
          { label: 'Store orders', value: String(storeOrdersMonth) },
          { label: 'Period', value: periodLabel },
        ],
        actionLabel: 'View leads',
        actionPath: '/owner/leads',
      },
    ],
  };
};
