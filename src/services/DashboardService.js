import {
  Member,
  Membership,
  MemberPayment,
  Invoice,
  Sale,
  Attendance,
  Enquiry,
  GymMembershipPlan,
  GymInvite,
  SaasPayment,
  SupportTicket,
  Tenant,
  Gym,
  User,
  Subscription,
} from '../schemas/index.js';
import * as GymModel from '../models/GymModel.js';
import * as AttendanceModel from '../models/AttendanceModel.js';
import { countDocuments, groupCount, sumField } from '../helpers/pagination.js';
import { lookupOne, notDeleted } from '../helpers/query.js';
import { COLLECTIONS, MEMBERSHIP_STATUS, PAYMENT_STATUS, INVOICE_STATUS, ROLES } from '../helpers/constants.js';
import { NotFoundError } from '../utils/errors.js';

const TZ = 'Asia/Kolkata';
const startOfMonth = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), 1);
const startOfLastMonth = (d = new Date()) => new Date(d.getFullYear(), d.getMonth() - 1, 1);

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

const fillMonthCounts = (rows, valueKey = 'count') => {
  const map = Object.fromEntries(rows.map((r) => [r._id, r[valueKey] || 0]));
  return monthBuckets().map((b) => ({ label: b.label, [valueKey]: map[b.key] || 0 }));
};

const paymentGymStages = (gymId, extraMatch = {}) => [
  ...lookupOne(COLLECTIONS.MEMBERSHIPS, 'membershipId', 'membership', { gymId: 1, memberId: 1, planId: 1 }),
  { $match: { $or: [{ gymId }, { 'membership.gymId': gymId }], ...extraMatch } },
];

export const getOwnerDashboard = async (tenantId, gymId, period = 'day') => {
  const gym = await GymModel.findById(gymId, tenantId);
  if (!gym) throw new NotFoundError('Gym not found');

  const now = new Date();
  const monthStart = startOfMonth(now);
  const lastMonthStart = startOfLastMonth(now);
  const fourteenDays = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  const [
    activeMembers,
    membersLastMonth,
    attendanceStats,
    weekTrend,
    expiringMemberships,
    recentPayments,
    recentInvoices,
    monthlySales,
    paidInvoices,
    membershipPayments,
    newMembersMonth,
    openLeads,
    expiringCount,
    memberByMonth,
    paymentByMonth,
    salesByMonth,
    invoiceByMonth,
    leadsByStatus,
    planGroups,
  ] = await Promise.all([
    countDocuments(Member, { gymId, ...notDeleted, isActive: true }),
    countDocuments(Member, {
      gymId,
      ...notDeleted,
      createdAt: { $lt: monthStart, $gte: lastMonthStart },
    }),
    AttendanceModel.todayStats(gymId),
    AttendanceModel.dailyTrend(gymId, 7),
    Membership.aggregate([
      {
        $match: {
          gymId,
          status: MEMBERSHIP_STATUS.ACTIVE,
          endDate: { $gte: now, $lte: fourteenDays },
        },
      },
      { $sort: { endDate: 1 } },
      { $limit: 4 },
      ...lookupOne(COLLECTIONS.MEMBERS, 'memberId', 'member', {
        _id: 0,
        id: '$_id',
        firstName: 1,
        lastName: 1,
        memberCode: 1,
      }),
      ...lookupOne(COLLECTIONS.GYM_MEMBERSHIP_PLANS, 'planId', 'plan', { _id: 0, id: '$_id', name: 1 }),
      {
        $project: {
          _id: 0,
          id: '$_id',
          endDate: 1,
          member: 1,
          plan: 1,
        },
      },
    ]),
    MemberPayment.aggregate([
      { $match: { status: PAYMENT_STATUS.COMPLETED } },
      ...paymentGymStages(gymId),
      { $sort: { createdAt: -1 } },
      { $limit: 5 },
      ...lookupOne(COLLECTIONS.MEMBERS, 'membership.memberId', 'member', {
        firstName: 1,
        lastName: 1,
      }),
      ...lookupOne(COLLECTIONS.GYM_MEMBERSHIP_PLANS, 'membership.planId', 'plan', { name: 1 }),
      {
        $project: {
          _id: 0,
          id: '$_id',
          amount: 1,
          status: 1,
          paidAt: 1,
          createdAt: 1,
          member: 1,
          plan: 1,
        },
      },
    ]),
    Invoice.aggregate([
      { $match: { gymId } },
      { $sort: { createdAt: -1 } },
      { $limit: 5 },
      {
        $project: {
          _id: 0,
          id: '$_id',
          invoiceNumber: 1,
          totalAmount: 1,
          status: 1,
          issuedAt: 1,
          createdAt: 1,
        },
      },
    ]),
    sumField(Sale, { match: { gymId, soldAt: { $gte: monthStart } }, field: 'totalAmount' }),
    sumField(Invoice, {
      match: { gymId, status: INVOICE_STATUS.PAID, paidAt: { $gte: monthStart } },
      field: 'totalAmount',
    }),
    MemberPayment.aggregate([
      { $match: { status: PAYMENT_STATUS.COMPLETED, paidAt: { $gte: monthStart } } },
      ...paymentGymStages(gymId),
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),
    countDocuments(Member, { gymId, ...notDeleted, createdAt: { $gte: monthStart } }),
    countDocuments(Enquiry, {
      gymId,
      status: { $in: ['NEW', 'CONTACTED', 'FOLLOW_UP', 'TRIAL'] },
    }),
    countDocuments(Membership, {
      gymId,
      status: MEMBERSHIP_STATUS.ACTIVE,
      endDate: { $gte: now, $lte: fourteenDays },
    }),
    Member.aggregate([
      { $match: { gymId, ...notDeleted, createdAt: { $gte: new Date(now.getFullYear(), now.getMonth() - 5, 1) } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt', timezone: TZ } },
          count: { $sum: 1 },
        },
      },
    ]),
    MemberPayment.aggregate([
      {
        $match: {
          status: PAYMENT_STATUS.COMPLETED,
          paidAt: { $gte: new Date(now.getFullYear(), now.getMonth() - 5, 1) },
        },
      },
      ...paymentGymStages(gymId),
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$paidAt', timezone: TZ } },
          amount: { $sum: '$amount' },
        },
      },
    ]),
    Sale.aggregate([
      { $match: { gymId, soldAt: { $gte: new Date(now.getFullYear(), now.getMonth() - 5, 1) } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$soldAt', timezone: TZ } },
          amount: { $sum: '$totalAmount' },
        },
      },
    ]),
    Invoice.aggregate([
      {
        $match: {
          gymId,
          status: INVOICE_STATUS.PAID,
          paidAt: { $gte: new Date(now.getFullYear(), now.getMonth() - 5, 1) },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$paidAt', timezone: TZ } },
          amount: { $sum: '$totalAmount' },
        },
      },
    ]),
    groupCount(Enquiry, { match: { gymId, deletedAt: null }, by: 'status' }),
    groupCount(Membership, { match: { gymId, status: MEMBERSHIP_STATUS.ACTIVE }, by: 'planId' }),
  ]);

  const membershipRevenue = Number(membershipPayments[0]?.total || 0);
  const storeRevenue = Number(monthlySales.total || 0);
  const invoiceRevenue = Number(paidInvoices.total || 0);
  const monthlyRevenue = membershipRevenue + storeRevenue + invoiceRevenue;

  const memberGrowthPct =
    membersLastMonth > 0
      ? Math.round(((activeMembers - membersLastMonth) / membersLastMonth) * 1000) / 10
      : activeMembers > 0
        ? 12
        : 0;

  const peakCapacity = 150;
  const checkInPct =
    peakCapacity > 0 ? Math.round((attendanceStats.currentlyInside / peakCapacity) * 1000) / 10 : 0;

  const hourLabel = (hour) => {
    const suffix = hour >= 12 ? 'PM' : 'AM';
    const value = hour % 12 || 12;
    return `${value} ${suffix}`;
  };
  const hourlyMap = Object.fromEntries((attendanceStats.hourly || []).map((item) => [item.hour, item.count]));
  const heatmap =
    period === 'week'
      ? weekTrend.map((item) => ({ label: item.label, count: item.count }))
      : Array.from({ length: 17 }, (_, i) => {
          const hour = i + 6;
          return { label: hourLabel(hour), count: hourlyMap[hour] || 0 };
        });

  const transactions = [
    ...recentPayments.map((p) => ({
      id: String(p.id).slice(0, 8).toUpperCase(),
      member: `${p.member?.firstName || ''} ${p.member?.lastName || ''}`.trim(),
      plan: p.plan?.name || 'Membership',
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

  const revenueMap = Object.fromEntries(monthBuckets().map((b) => [b.key, { membership: 0, store: 0, invoices: 0 }]));
  for (const row of paymentByMonth) {
    if (revenueMap[row._id]) revenueMap[row._id].membership += Number(row.amount || 0);
  }
  for (const row of salesByMonth) {
    if (revenueMap[row._id]) revenueMap[row._id].store += Number(row.amount || 0);
  }
  for (const row of invoiceByMonth) {
    if (revenueMap[row._id]) revenueMap[row._id].invoices += Number(row.amount || 0);
  }
  const revenueTrend = monthBuckets().map((b) => {
    const bucket = revenueMap[b.key];
    const membership = Math.round(bucket.membership);
    const store = Math.round(bucket.store);
    const invoices = Math.round(bucket.invoices);
    return { label: b.label, membership, store, invoices, total: membership + store + invoices };
  });

  const memberTrend = fillMonthCounts(memberByMonth, 'count').map((b) => ({
    label: b.label,
    count: b.count,
  }));

  const planIds = planGroups.map((p) => p._id).filter(Boolean);
  const plans = planIds.length
    ? await GymMembershipPlan.find({ _id: { $in: planIds } }).select('name')
    : [];
  const planNameById = Object.fromEntries(plans.map((p) => [p._id, p.name]));
  const planMix = planGroups
    .map((g) => ({
      name: planNameById[g._id] || 'Unknown plan',
      count: g.count,
    }))
    .sort((a, b) => b.count - a.count);

  const leads = leadsByStatus.map((l) => ({
    status: l._id,
    count: l.count,
  }));

  return {
    stats: {
      activeMembers,
      todayCheckIns: attendanceStats.totalToday,
      currentlyInside: attendanceStats.currentlyInside,
      checkInCapacityPct: checkInPct,
      monthlyRevenue,
      membershipRevenue,
      storeRevenue,
      invoiceRevenue,
      memberGrowthPct,
      expiringCount,
      newMembersMonth,
      openLeads,
    },
    charts: {
      attendance: heatmap,
      revenue: revenueTrend,
      members: memberTrend,
      plans: planMix,
      leads,
    },
    heatmap,
    expirations,
    transactions,
    peakCapacity,
  };
};

export const getOwnerAnalytics = async (tenantId, gymId) => {
  const gym = await GymModel.findById(gymId, tenantId);
  if (!gym) throw new NotFoundError('Gym not found');

  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const monthExpr = (field) => ({
    $dateToString: { format: '%Y-%m', date: `$${field}`, timezone: TZ },
  });

  const [
    memberByMonth,
    newMembers30d,
    weekdayRows,
    paymentByMonth,
    salesByMonth,
    invoiceByMonth,
    leadsByStatus,
    planGroups,
    activeMembers,
    totalCheckIns30d,
  ] = await Promise.all([
    Member.aggregate([
      { $match: { gymId, ...notDeleted, createdAt: { $gte: sixMonthsAgo } } },
      { $group: { _id: monthExpr('createdAt'), count: { $sum: 1 } } },
    ]),
    countDocuments(Member, { gymId, ...notDeleted, createdAt: { $gte: thirtyDaysAgo } }),
    Attendance.aggregate([
      { $match: { gymId, checkInAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dayOfWeek: { date: '$checkInAt', timezone: TZ } },
          count: { $sum: 1 },
        },
      },
    ]),
    MemberPayment.aggregate([
      { $match: { status: PAYMENT_STATUS.COMPLETED, paidAt: { $gte: sixMonthsAgo } } },
      ...paymentGymStages(gymId),
      { $group: { _id: monthExpr('paidAt'), amount: { $sum: '$amount' } } },
    ]),
    Sale.aggregate([
      { $match: { gymId, soldAt: { $gte: sixMonthsAgo } } },
      { $group: { _id: monthExpr('soldAt'), amount: { $sum: '$totalAmount' } } },
    ]),
    Invoice.aggregate([
      { $match: { gymId, status: INVOICE_STATUS.PAID, paidAt: { $gte: sixMonthsAgo } } },
      { $group: { _id: monthExpr('paidAt'), amount: { $sum: '$totalAmount' } } },
    ]),
    groupCount(Enquiry, { match: { gymId }, by: 'status' }),
    groupCount(Membership, { match: { gymId, status: MEMBERSHIP_STATUS.ACTIVE }, by: 'planId' }),
    countDocuments(Member, { gymId, ...notDeleted, isActive: true }),
    countDocuments(Attendance, { gymId, checkInAt: { $gte: thirtyDaysAgo } }),
  ]);

  const memberTrend = fillMonthCounts(memberByMonth, 'count').map((b) => ({
    label: b.label,
    count: b.count,
  }));

  const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const weekdayMap = Object.fromEntries(weekdayRows.map((r) => [r._id, r.count]));
  const weekdayCounts = weekdayLabels.map((label, idx) => ({
    label,
    count: weekdayMap[idx + 1] || 0,
  }));

  const revenueMap = Object.fromEntries(monthBuckets().map((b) => [b.key, 0]));
  for (const row of [...paymentByMonth, ...salesByMonth, ...invoiceByMonth]) {
    if (row._id in revenueMap) revenueMap[row._id] += Number(row.amount || 0);
  }
  const revenueTrend = monthBuckets().map((b) => ({
    label: b.label,
    amount: Math.round(revenueMap[b.key] || 0),
  }));

  const planIds = planGroups.map((p) => p._id).filter(Boolean);
  const plans = planIds.length
    ? await GymMembershipPlan.find({ _id: { $in: planIds } }).select('name')
    : [];
  const planNameById = Object.fromEntries(plans.map((p) => [p._id, p.name]));

  const planMix = planGroups
    .map((g) => ({
      plan: planNameById[g._id] || 'Unknown plan',
      count: g.count,
    }))
    .sort((a, b) => b.count - a.count);

  const avgDailyCheckIns = totalCheckIns30d > 0 ? Math.round((totalCheckIns30d / 30) * 10) / 10 : 0;

  return {
    summary: {
      activeMembers,
      newMembers30d,
      totalCheckIns30d,
      avgDailyCheckIns,
      totalLeads: leadsByStatus.reduce((sum, l) => sum + l.count, 0),
    },
    memberTrend,
    weekdayAttendance: weekdayCounts,
    revenueTrend,
    leadsByStatus: leadsByStatus.map((l) => ({
      status: l._id,
      count: l.count,
    })),
    planMix,
  };
};

export const getOwnerReports = async (tenantId, gymId) => {
  const gym = await GymModel.findById(gymId, tenantId);
  if (!gym) throw new NotFoundError('Gym not found');

  const now = new Date();
  const monthStart = startOfMonth(now);
  const fourteenDays = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

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
    countDocuments(Member, { gymId, ...notDeleted, isActive: true }),
    countDocuments(Member, { gymId, ...notDeleted, createdAt: { $gte: monthStart } }),
    countDocuments(Attendance, { gymId, checkInAt: { $gte: monthStart } }),
    countDocuments(Membership, {
      gymId,
      status: MEMBERSHIP_STATUS.ACTIVE,
      endDate: { $gte: now, $lte: fourteenDays },
    }),
    MemberPayment.aggregate([
      { $match: { status: PAYMENT_STATUS.COMPLETED, paidAt: { $gte: monthStart } } },
      ...paymentGymStages(gymId),
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),
    sumField(Sale, { match: { gymId, soldAt: { $gte: monthStart } }, field: 'totalAmount' }),
    sumField(Invoice, {
      match: { gymId, status: INVOICE_STATUS.PAID, paidAt: { $gte: monthStart } },
      field: 'totalAmount',
    }),
    countDocuments(Enquiry, {
      gymId,
      status: { $in: ['NEW', 'CONTACTED', 'FOLLOW_UP', 'TRIAL'] },
    }),
    countDocuments(Sale, { gymId, soldAt: { $gte: monthStart } }),
  ]);

  const membershipRevenue = Number(paymentsMonth[0]?.total || 0);
  const storeRevenue = Number(salesMonth.total || 0);
  const invoiceRevenue = Number(invoicesMonth.total || 0);
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

const PENDING_INVITE_STATUSES = ['PENDING', 'SENT', 'PAYMENT_PENDING'];
const OPEN_TICKET_STATUSES = ['OPEN', 'IN_PROGRESS'];

export const getAdminDashboard = async () => {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const monthExpr = (field) => ({
    $dateToString: { format: '%Y-%m', date: `$${field}`, timezone: TZ },
  });

  const [
    invites,
    pendingInvites,
    invitesThisMonth,
    owners,
    tenants,
    gyms,
    publishedGyms,
    openTickets,
    monthlyPayments,
    allTimePayments,
    invitesByStatus,
    ticketsByStatus,
    subscriptionsByStatus,
    inviteByMonth,
    paymentByMonth,
    recentPayments,
    recentPendingInvites,
    recentTickets,
  ] = await Promise.all([
    countDocuments(GymInvite, { ...notDeleted }),
    countDocuments(GymInvite, { ...notDeleted, status: { $in: PENDING_INVITE_STATUSES } }),
    countDocuments(GymInvite, { ...notDeleted, createdAt: { $gte: monthStart } }),
    countDocuments(User, { role: ROLES.GYM_OWNER, ...notDeleted }),
    countDocuments(Tenant, { ...notDeleted, isActive: true }),
    countDocuments(Gym, { ...notDeleted, isActive: true }),
    countDocuments(Gym, { ...notDeleted, isActive: true, appPublished: true }),
    countDocuments(SupportTicket, { ...notDeleted, status: { $in: OPEN_TICKET_STATUSES } }),
    sumField(SaasPayment, {
      match: { status: PAYMENT_STATUS.COMPLETED, paidAt: { $gte: monthStart } },
      field: 'amount',
    }),
    sumField(SaasPayment, { match: { status: PAYMENT_STATUS.COMPLETED }, field: 'amount' }),
    groupCount(GymInvite, { match: { ...notDeleted }, by: 'status' }),
    groupCount(SupportTicket, { match: { ...notDeleted }, by: 'status' }),
    groupCount(Subscription, { match: { ...notDeleted }, by: 'status' }),
    GymInvite.aggregate([
      { $match: { ...notDeleted, createdAt: { $gte: sixMonthsAgo } } },
      { $group: { _id: monthExpr('createdAt'), count: { $sum: 1 } } },
    ]),
    SaasPayment.aggregate([
      { $match: { status: PAYMENT_STATUS.COMPLETED, paidAt: { $gte: sixMonthsAgo } } },
      { $group: { _id: monthExpr('paidAt'), amount: { $sum: '$amount' } } },
    ]),
    SaasPayment.aggregate([
      { $sort: { createdAt: -1 } },
      { $limit: 5 },
      ...lookupOne(COLLECTIONS.TENANTS, 'tenantId', 'tenant', { name: 1, email: 1 }),
      {
        $project: {
          _id: 0,
          id: '$_id',
          amount: 1,
          status: 1,
          paidAt: 1,
          createdAt: 1,
          provider: 1,
          tenant: 1,
        },
      },
    ]),
    GymInvite.find({ ...notDeleted, status: { $in: PENDING_INVITE_STATUSES } })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('email inviteeName businessName status expiresAt createdAt')
      .lean(),
    SupportTicket.find({ ...notDeleted, status: { $in: OPEN_TICKET_STATUSES } })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('subject senderName senderEmail status category createdAt')
      .lean(),
  ]);

  const revenueTrend = monthBuckets().map((b) => {
    const row = paymentByMonth.find((r) => r._id === b.key);
    return { label: b.label, amount: Math.round(Number(row?.amount || 0)) };
  });

  return {
    stats: {
      invites,
      pendingInvites,
      invitesThisMonth,
      owners,
      tenants,
      gyms,
      publishedGyms,
      openTickets,
      monthlyRevenue: Math.round(Number(monthlyPayments.total || 0)),
      totalRevenue: Math.round(Number(allTimePayments.total || 0)),
    },
    charts: {
      revenue: revenueTrend,
      invites: fillMonthCounts(inviteByMonth, 'count').map((b) => ({
        label: b.label,
        count: b.count,
      })),
      inviteStatus: invitesByStatus.map((row) => ({ status: row._id, count: row.count })),
      tickets: ticketsByStatus.map((row) => ({ status: row._id, count: row.count })),
      subscriptions: subscriptionsByStatus.map((row) => ({ status: row._id, count: row.count })),
    },
    transactions: recentPayments.map((p) => ({
      id: p.id,
      amount: Number(p.amount || 0),
      status: p.status,
      date: p.paidAt || p.createdAt,
      provider: p.provider || '—',
      tenant: p.tenant?.name || p.tenant?.email || '—',
    })),
    pendingInvites: recentPendingInvites.map((invite) => ({
      id: invite._id,
      email: invite.email,
      name: invite.inviteeName || invite.businessName || invite.email,
      businessName: invite.businessName || '—',
      status: invite.status,
      expiresAt: invite.expiresAt,
      createdAt: invite.createdAt,
    })),
    tickets: recentTickets.map((ticket) => ({
      id: ticket._id,
      subject: ticket.subject,
      sender: ticket.senderName || ticket.senderEmail,
      status: ticket.status,
      category: ticket.category,
      createdAt: ticket.createdAt,
    })),
  };
};
