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
