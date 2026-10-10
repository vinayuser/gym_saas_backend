import {
  MemberPayment,
  Membership,
  Sale,
  Invoice,
} from '../schemas/index.js';
import * as GymModel from '../models/GymModel.js';
import { lookupOne } from '../helpers/query.js';
import { COLLECTIONS } from '../helpers/constants.js';
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

const saleMatch = (gymId) => ({
  gymId,
  status: 'COMPLETED',
  fulfillmentStatus: { $ne: 'CANCELLED' },
});

const PENDING_STATUSES = ['PENDING', 'ISSUED', 'DRAFT', 'PLACED', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP'];

const nameConcat = (first, last) => ({
  $trim: { input: { $concat: [{ $ifNull: [first, ''] }, ' ', { $ifNull: [last, ''] }] } },
});

const paymentEntryPipeline = (gymId) => [
  ...lookupOne(COLLECTIONS.MEMBERSHIPS, 'membershipId', 'membership'),
  { $match: { $or: [{ gymId }, { 'membership.gymId': gymId }] } },
  ...lookupOne(COLLECTIONS.MEMBERS, 'membership.memberId', 'member', {
    firstName: 1,
    lastName: 1,
    memberCode: 1,
  }),
  ...lookupOne(COLLECTIONS.GYM_MEMBERSHIP_PLANS, 'membership.planId', 'plan', { name: 1 }),
  {
    $project: {
      _id: 0,
      id: '$_id',
      source: { $literal: 'SUBSCRIPTIONS' },
      date: { $ifNull: ['$paidAt', '$createdAt'] },
      label: {
        $trim: {
          input: {
            $concat: [
              { $ifNull: ['$plan.name', 'Membership'] },
              ' — ',
              { $ifNull: ['$member.firstName', ''] },
              ' ',
              { $ifNull: ['$member.lastName', ''] },
            ],
          },
        },
      },
      refId: { $ifNull: ['$providerRef', { $toUpper: { $substrCP: ['$_id', 0, 8] } }] },
      amount: { $ifNull: ['$amount', 0] },
      status: 1,
      method: { $ifNull: ['$method', 'UPI'] },
      memberName: nameConcat('$member.firstName', '$member.lastName'),
      memberCode: '$member.memberCode',
      planName: '$plan.name',
      type: { $literal: 'payment' },
    },
  },
];

const syntheticMembershipPipeline = (gymId) => [
  { $match: { gymId, amountPaid: { $ne: null } } },
  {
    $lookup: {
      from: COLLECTIONS.MEMBER_PAYMENTS,
      localField: '_id',
      foreignField: 'membershipId',
      as: 'payments',
    },
  },
  { $match: { payments: { $eq: [] } } },
  ...lookupOne(COLLECTIONS.MEMBERS, 'memberId', 'member', { firstName: 1, lastName: 1, memberCode: 1 }),
  ...lookupOne(COLLECTIONS.GYM_MEMBERSHIP_PLANS, 'planId', 'plan', { name: 1 }),
  {
    $project: {
      _id: 0,
      id: { $concat: ['membership-', '$_id'] },
      source: { $literal: 'SUBSCRIPTIONS' },
      date: '$createdAt',
      label: {
        $trim: {
          input: {
            $concat: [
              { $ifNull: ['$plan.name', 'Membership'] },
              ' — ',
              { $ifNull: ['$member.firstName', ''] },
              ' ',
              { $ifNull: ['$member.lastName', ''] },
            ],
          },
        },
      },
      refId: '$member.memberCode',
      amount: { $ifNull: ['$amountPaid', 0] },
      status: { $literal: 'COMPLETED' },
      method: { $literal: 'CASH' },
      memberName: nameConcat('$member.firstName', '$member.lastName'),
      memberCode: '$member.memberCode',
      planName: '$plan.name',
      type: { $literal: 'membership' },
    },
  },
];

const storeEntryPipeline = (gymId) => [
  { $match: saleMatch(gymId) },
  ...lookupOne(COLLECTIONS.MEMBERS, 'memberId', 'member', { firstName: 1, lastName: 1, memberCode: 1 }),
  {
    $lookup: {
      from: COLLECTIONS.SALE_ITEMS,
      let: { sid: '$_id' },
      pipeline: [
        { $match: { $expr: { $eq: ['$saleId', '$$sid'] } } },
        {
          $lookup: {
            from: COLLECTIONS.PRODUCTS,
            localField: 'productId',
            foreignField: '_id',
            as: 'product',
          },
        },
        { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
      ],
      as: 'items',
    },
  },
  {
    $project: {
      _id: 0,
      id: '$_id',
      source: { $literal: 'STORE_SALES' },
      date: '$soldAt',
      label: {
        $concat: [
          'Store order ',
          { $ifNull: ['$orderNumber', { $toUpper: { $substrCP: ['$_id', 0, 8] } }] },
          {
            $cond: [
              { $ifNull: ['$member.firstName', false] },
              {
                $concat: [' — ', { $ifNull: ['$member.firstName', ''] }, ' ', { $ifNull: ['$member.lastName', ''] }],
              },
              '',
            ],
          },
        ],
      },
      refId: { $ifNull: ['$orderNumber', { $toUpper: { $substrCP: ['$_id', 0, 8] } }] },
      amount: { $ifNull: ['$totalAmount', 0] },
      status: '$fulfillmentStatus',
      method: { $literal: 'STORE' },
      memberName: {
        $cond: [
          { $ifNull: ['$member.firstName', false] },
          nameConcat('$member.firstName', '$member.lastName'),
          'Walk-in',
        ],
      },
      memberCode: '$member.memberCode',
      planName: { $literal: null },
      type: { $literal: 'store_order' },
      itemCount: { $sum: '$items.quantity' },
      products: {
        $filter: {
          input: { $map: { input: '$items', as: 'i', in: '$$i.product.name' } },
          as: 'n',
          cond: { $and: [{ $ne: ['$$n', null] }, { $ne: ['$$n', ''] }] },
        },
      },
    },
  },
];

const invoiceEntryPipeline = (gymId) => [
  { $match: { gymId } },
  {
    $project: {
      _id: 0,
      id: '$_id',
      source: { $literal: 'INVOICES' },
      date: { $ifNull: ['$paidAt', { $ifNull: ['$issuedAt', '$createdAt'] }] },
      label: { $concat: ['Invoice ', '$invoiceNumber'] },
      refId: '$invoiceNumber',
      amount: { $ifNull: ['$totalAmount', 0] },
      status: 1,
      method: { $literal: 'INVOICE' },
      memberName: { $literal: null },
      memberCode: { $literal: null },
      planName: { $literal: null },
      type: { $literal: 'invoice' },
    },
  },
];

const sourcesFor = (gymId, category) => {
  const sources = [];
  if (category === 'ALL' || category === 'SUBSCRIPTIONS') {
    sources.push({ Model: MemberPayment, coll: COLLECTIONS.MEMBER_PAYMENTS, pipeline: paymentEntryPipeline(gymId) });
    sources.push({ Model: Membership, coll: COLLECTIONS.MEMBERSHIPS, pipeline: syntheticMembershipPipeline(gymId) });
  }
  if (category === 'ALL' || category === 'STORE_SALES') {
    sources.push({ Model: Sale, coll: COLLECTIONS.SALES, pipeline: storeEntryPipeline(gymId) });
  }
  if (category === 'ALL' || category === 'INVOICES') {
    sources.push({ Model: Invoice, coll: COLLECTIONS.INVOICES, pipeline: invoiceEntryPipeline(gymId) });
  }
  return sources;
};

const unionAggregate = (gymId, category, extra = []) => {
  const sources = sourcesFor(gymId, category);
  const [first, ...rest] = sources;
  return first.Model.aggregate([
    ...first.pipeline,
    ...rest.map((s) => ({ $unionWith: { coll: s.coll, pipeline: s.pipeline } })),
    ...extra,
  ]);
};

const facetPage = async (gymId, category, query, extra = []) => {
  const exportAll = isFinanceExport(query);
  const pagination = parsePagination(query);
  const skip = exportAll ? 0 : pagination.skip;
  const limit = exportAll ? 10000 : pagination.limit;
  const [out] = await unionAggregate(gymId, category, [
    ...extra,
    {
      $facet: {
        data: [{ $skip: skip }, { $limit: Math.max(limit, 1) }],
        meta: [{ $count: 'total' }],
      },
    },
  ]);
  const total = out?.meta?.[0]?.total ?? 0;
  return {
    items: out?.data || [],
    pagination: buildPaginationMeta(
      total,
      exportAll ? 1 : pagination.page,
      exportAll ? total || 1 : pagination.limit
    ),
  };
};

const sumMatch = async (Model, match, field) => {
  const [row] = await Model.aggregate([
    { $match: match },
    { $group: { _id: null, total: { $sum: `$${field}` }, count: { $sum: 1 } } },
  ]);
  return { total: row?.total ?? 0, count: row?.count ?? 0 };
};

const subscriptionTotals = async (gymId) => {
  const [payments, synthetic] = await Promise.all([
    MemberPayment.aggregate([
      ...lookupOne(COLLECTIONS.MEMBERSHIPS, 'membershipId', 'membership', { gymId: 1 }),
      { $match: { $or: [{ gymId }, { 'membership.gymId': gymId }], status: 'COMPLETED' } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),
    Membership.aggregate([
      { $match: { gymId, amountPaid: { $ne: null } } },
      {
        $lookup: {
          from: COLLECTIONS.MEMBER_PAYMENTS,
          localField: '_id',
          foreignField: 'membershipId',
          as: 'payments',
        },
      },
      { $match: { payments: { $eq: [] } } },
      { $group: { _id: null, total: { $sum: '$amountPaid' }, count: { $sum: 1 } } },
    ]),
  ]);
  const paymentCount = await MemberPayment.aggregate([
    ...lookupOne(COLLECTIONS.MEMBERSHIPS, 'membershipId', 'membership', { gymId: 1 }),
    { $match: { $or: [{ gymId }, { 'membership.gymId': gymId }] } },
    { $count: 'n' },
  ]);
  return {
    revenue: Number(payments[0]?.total || 0) + Number(synthetic[0]?.total || 0),
    count: (paymentCount[0]?.n || 0) + (synthetic[0]?.count || 0),
  };
};

const buildWeeklyTrend = (buckets, weeks = 8) => {
  const max = Math.max(...buckets.map((b) => b.amount), 1);
  return buckets.map((b) => ({ ...b, pct: Math.round((b.amount / max) * 100) }));
};

export const overview = async (tenantId, gymId, query = {}) => {
  await validateGym(tenantId, gymId);
  const category = parseCategory(query);
  const weeks = 8;
  const now = new Date();
  const trendStart = new Date(now);
  trendStart.setDate(trendStart.getDate() - (weeks - 1) * 7);
  trendStart.setHours(0, 0, 0, 0);
  const weekMs = 7 * 24 * 60 * 60 * 1000;

  const [subs, store, invoicesPaid, invoicesOverdue, pendingFacet, trendRows, recent] = await Promise.all([
    subscriptionTotals(gymId),
    sumMatch(Sale, saleMatch(gymId), 'totalAmount'),
    sumMatch(Invoice, { gymId, status: 'PAID' }, 'totalAmount'),
    sumMatch(Invoice, { gymId, status: 'OVERDUE' }, 'totalAmount'),
    unionAggregate(gymId, category, [
      { $match: { status: { $in: PENDING_STATUSES } } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),
    unionAggregate(gymId, category, [
      { $match: { date: { $gte: trendStart } } },
      {
        $group: {
          _id: { $floor: { $divide: [{ $subtract: ['$date', trendStart] }, weekMs] } },
          amount: { $sum: '$amount' },
        },
      },
    ]),
    unionAggregate(gymId, category, [
      { $sort: { date: -1 } },
      { $limit: 10 },
      {
        $project: {
          _id: 0,
          id: 1,
          type: 1,
          source: 1,
          label: 1,
          amount: 1,
          status: 1,
          at: '$date',
        },
      },
    ]),
  ]);

  const subscriptionRevenue = subs.revenue;
  const storeRevenue = Number(store.total || 0);
  const invoiceRevenue = Number(invoicesPaid.total || 0);

  const totalRevenue =
    category === 'SUBSCRIPTIONS'
      ? subscriptionRevenue
      : category === 'STORE_SALES'
        ? storeRevenue
        : category === 'INVOICES'
          ? invoiceRevenue
          : subscriptionRevenue + storeRevenue + invoiceRevenue;

  const trendMap = Object.fromEntries(trendRows.map((r) => [r._id, r.amount]));
  const trend = buildWeeklyTrend(
    Array.from({ length: weeks }, (_, i) => ({
      label: `W${i + 1}`,
      amount: Number(trendMap[i] || 0),
    })),
    weeks
  );

  return {
    category,
    totalRevenue,
    subscriptionRevenue,
    storeRevenue,
    invoiceRevenue,
    pendingAmount: Number(pendingFacet[0]?.total || 0),
    overdueAmount: Number(invoicesOverdue.total || 0),
    pendingCount: pendingFacet[0]?.count || 0,
    overdueCount: invoicesOverdue.count || 0,
    orderCount: store.count || 0,
    subscriptionCount: subs.count,
    trend,
    recent,
  };
};

export const ledger = async (tenantId, gymId, query) => {
  await validateGym(tenantId, gymId);
  const category = parseCategory(query);

  const { items, pagination } = await facetPage(gymId, category, query, [
    {
      $addFields: {
        isCredit: {
          $or: [
            { $in: ['$status', ['COMPLETED', 'PAID', 'COLLECTED']] },
            { $in: ['$type', ['store_order', 'membership']] },
          ],
        },
      },
    },
    {
      $project: {
        _id: 0,
        id: 1,
        date: 1,
        narration: '$label',
        refId: 1,
        debit: { $cond: ['$isCredit', 0, '$amount'] },
        credit: { $cond: ['$isCredit', '$amount', 0] },
        gst: {
          $round: [{ $multiply: [{ $cond: ['$isCredit', '$amount', 0] }, 0.18] }, 2],
        },
        method: 1,
        category: '$source',
        status: 1,
      },
    },
    { $sort: { date: -1 } },
    ...(String(query.search || '').trim()
      ? [
          {
            $match: {
              $or: ['narration', 'refId', 'method'].map((field) => ({
                [field]: { $regex: String(query.search).trim(), $options: 'i' },
              })),
            },
          },
        ]
      : []),
  ]);

  return {
    entries: items,
    category,
    pagination,
  };
};

const membershipPaymentRows = (gymId) => [
  { $match: { gymId } },
  ...lookupOne(COLLECTIONS.MEMBERS, 'memberId', 'member', {
    firstName: 1,
    lastName: 1,
    memberCode: 1,
  }),
  ...lookupOne(COLLECTIONS.GYM_MEMBERSHIP_PLANS, 'planId', 'plan', { name: 1 }),
  {
    $lookup: {
      from: COLLECTIONS.MEMBER_PAYMENTS,
      let: { mid: '$_id' },
      pipeline: [
        { $match: { $expr: { $eq: ['$membershipId', '$$mid'] } } },
        { $sort: { createdAt: -1 } },
        {
          $project: {
            _id: 0,
            id: '$_id',
            amount: 1,
            status: 1,
            method: 1,
            paidAt: 1,
            createdAt: 1,
            membershipId: 1,
          },
        },
      ],
      as: 'payments',
    },
  },
  {
    $addFields: {
      balance: {
        $sum: {
          $map: {
            input: {
              $filter: { input: '$payments', as: 'p', cond: { $ne: ['$$p.status', 'COMPLETED'] } },
            },
            as: 'p',
            in: '$$p.amount',
          },
        },
      },
      completedPaid: {
        $sum: {
          $map: {
            input: {
              $filter: { input: '$payments', as: 'p', cond: { $eq: ['$$p.status', 'COMPLETED'] } },
            },
            as: 'p',
            in: '$$p.amount',
          },
        },
      },
    },
  },
  {
    $project: {
      _id: 0,
      id: '$_id',
      source: { $literal: 'SUBSCRIPTIONS' },
      memberId: 1,
      memberName: nameConcat('$member.firstName', '$member.lastName'),
      memberCode: '$member.memberCode',
      planName: '$plan.name',
      status: 1,
      balance: 1,
      totalPaid: { $cond: [{ $gt: ['$completedPaid', 0] }, '$completedPaid', { $ifNull: ['$amountPaid', 0] }] },
      payments: 1,
      sortDate: {
        $ifNull: [{ $arrayElemAt: ['$payments.paidAt', 0] }, { $arrayElemAt: ['$payments.createdAt', 0] }],
      },
    },
  },
];

const storePaymentRows = (gymId) => [
  ...storeEntryPipeline(gymId),
  {
    $project: {
      _id: 0,
      id: 1,
      source: 1,
      memberId: { $literal: null },
      memberName: 1,
      memberCode: 1,
      planName: {
        $cond: [
          { $gt: [{ $size: { $ifNull: ['$products', []] } }, 0] },
          {
            $reduce: {
              input: '$products',
              initialValue: '',
              in: {
                $cond: [
                  { $eq: ['$$value', ''] },
                  '$$this',
                  { $concat: ['$$value', ', ', '$$this'] },
                ],
              },
            },
          },
          'Store purchase',
        ],
      },
      status: 1,
      balance: {
        $cond: [{ $in: ['$status', ['PLACED', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP']] }, '$amount', 0],
      },
      totalPaid: '$amount',
      payments: [
        {
          id: '$id',
          amount: '$amount',
          status: { $literal: 'COMPLETED' },
          method: { $literal: 'STORE' },
          paidAt: '$date',
          createdAt: '$date',
        },
      ],
      sortDate: '$date',
    },
  },
];

const invoicePaymentRows = (gymId) => [
  ...invoiceEntryPipeline(gymId),
  {
    $project: {
      _id: 0,
      id: 1,
      source: 1,
      memberId: { $literal: null },
      memberName: '$label',
      memberCode: '$refId',
      planName: { $literal: 'Invoice' },
      status: 1,
      balance: { $cond: [{ $eq: ['$status', 'PAID'] }, 0, '$amount'] },
      totalPaid: { $cond: [{ $eq: ['$status', 'PAID'] }, '$amount', 0] },
      payments: [
        {
          id: '$id',
          amount: '$amount',
          status: '$status',
          method: { $literal: 'INVOICE' },
          paidAt: { $cond: [{ $eq: ['$status', 'PAID'] }, '$date', null] },
          createdAt: '$date',
        },
      ],
      sortDate: '$date',
    },
  },
];

export const payments = async (tenantId, gymId, query) => {
  await validateGym(tenantId, gymId);
  const category = parseCategory(query);

  const sources = [];
  if (category === 'ALL' || category === 'SUBSCRIPTIONS') {
    sources.push({ Model: Membership, coll: COLLECTIONS.MEMBERSHIPS, pipeline: membershipPaymentRows(gymId) });
  }
  if (category === 'ALL' || category === 'STORE_SALES') {
    sources.push({ Model: Sale, coll: COLLECTIONS.SALES, pipeline: storePaymentRows(gymId) });
  }
  if (category === 'INVOICES') {
    sources.push({ Model: Invoice, coll: COLLECTIONS.INVOICES, pipeline: invoicePaymentRows(gymId) });
  }

  const exportAll = isFinanceExport(query);
  const pagination = parsePagination(query);
  const skip = exportAll ? 0 : pagination.skip;
  const limit = exportAll ? 10000 : pagination.limit;
  const [first, ...rest] = sources;
  const [out] = await first.Model.aggregate([
    ...first.pipeline,
    ...rest.map((s) => ({ $unionWith: { coll: s.coll, pipeline: s.pipeline } })),
    { $sort: { sortDate: -1 } },
    ...(String(query.search || '').trim()
      ? [
          {
            $match: {
              $or: ['memberName', 'memberCode', 'planName', 'status'].map((field) => ({
                [field]: { $regex: String(query.search).trim(), $options: 'i' },
              })),
            },
          },
        ]
      : []),
    {
      $facet: {
        data: [{ $skip: skip }, { $limit: Math.max(limit, 1) }, { $project: { sortDate: 0 } }],
        meta: [{ $count: 'total' }],
      },
    },
  ]);

  const total = out?.meta?.[0]?.total ?? 0;
  return {
    rows: out?.data || [],
    category,
    pagination: buildPaginationMeta(
      total,
      exportAll ? 1 : pagination.page,
      exportAll ? total || 1 : pagination.limit
    ),
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
