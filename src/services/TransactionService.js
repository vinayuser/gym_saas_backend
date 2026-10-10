import { SaasPayment } from '../schemas/index.js';
import { paginate, aggregateOne, groupCount, sumField } from '../helpers/pagination.js';
import { lookupOne } from '../helpers/query.js';
import { COLLECTIONS, SORT } from '../helpers/constants.js';
import { parsePagination, buildPaginationMeta } from '../utils/response.js';

const paymentLookups = [
  {
    $lookup: {
      from: COLLECTIONS.SUBSCRIPTIONS,
      let: { sid: '$subscriptionId' },
      pipeline: [
        { $match: { $expr: { $eq: ['$_id', '$$sid'] } } },
        ...lookupOne(COLLECTIONS.SUBSCRIPTION_PLANS, 'planId', 'plan', {
          _id: 0,
          id: '$_id',
          name: 1,
          type: 1,
          priceMonthly: 1,
        }),
        {
          $lookup: {
            from: COLLECTIONS.TENANTS,
            let: { tid: '$tenantId' },
            pipeline: [
              { $match: { $expr: { $eq: ['$_id', '$$tid'] } } },
              ...lookupOne(COLLECTIONS.USERS, 'ownerId', 'owner', {
                _id: 0,
                id: '$_id',
                email: 1,
                firstName: 1,
                lastName: 1,
              }),
              {
                $lookup: {
                  from: COLLECTIONS.GYM_INVITES,
                  let: { tenantId: '$_id' },
                  pipeline: [
                    { $match: { $expr: { $eq: ['$tenantId', '$$tenantId'] }, status: 'ACCEPTED' } },
                    { $sort: { acceptedAt: -1 } },
                    { $limit: 1 },
                    {
                      $project: {
                        _id: 0,
                        id: '$_id',
                        email: 1,
                        businessName: 1,
                        token: 1,
                        razorpayOrderId: 1,
                        razorpayPaymentId: 1,
                        acceptedAt: 1,
                      },
                    },
                  ],
                  as: 'gymInvites',
                },
              },
              {
                $project: {
                  _id: 0,
                  id: '$_id',
                  name: 1,
                  email: 1,
                  slug: 1,
                  owner: 1,
                  gymInvites: 1,
                },
              },
            ],
            as: 'tenant',
          },
        },
        { $unwind: { path: '$tenant', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 0,
            id: '$_id',
            status: 1,
            plan: 1,
            tenant: 1,
          },
        },
      ],
      as: 'subscription',
    },
  },
  { $unwind: { path: '$subscription', preserveNullAndEmptyArrays: true } },
];

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

const nestedSearch = (search) => {
  const value = search?.trim();
  if (!value) return {};
  return {
    $or: [
      { providerRef: { $regex: value, $options: 'i' } },
      { provider: { $regex: value, $options: 'i' } },
      { 'subscription.tenant.name': { $regex: value, $options: 'i' } },
      { 'subscription.tenant.email': { $regex: value, $options: 'i' } },
      { 'subscription.tenant.owner.email': { $regex: value, $options: 'i' } },
      { 'subscription.plan.name': { $regex: value, $options: 'i' } },
    ],
  };
};

const paymentProject = {
  _id: 0,
  id: '$_id',
  amount: 1,
  currency: 1,
  status: 1,
  provider: 1,
  providerRef: 1,
  paidAt: 1,
  createdAt: 1,
  subscriptionId: 1,
  subscription: 1,
};

export const listTransactions = async (query) => {
  const pagination = parsePagination(query);
  const search = query.search?.trim();

  const match = {};
  if (query.status && query.status !== 'ALL') {
    match.status = query.status;
  }

  const { data: payments, pagination: pageMeta } = await paginate(SaasPayment, {
    match,
    before: search ? [...paymentLookups, { $match: nestedSearch(search) }] : [],
    lookups: search ? [] : paymentLookups,
    project: paymentProject,
    sort: SORT.CREATED_DESC,
    page: pagination.page,
    limit: pagination.limit,
  });

  const [completedAgg, statusGroups] = await Promise.all([
    sumField(SaasPayment, { match: { status: 'COMPLETED' }, field: 'amount' }),
    groupCount(SaasPayment, { by: 'status' }),
  ]);

  const statusCounts = Object.fromEntries(statusGroups.map((g) => [g._id, g.count]));

  return {
    transactions: payments.map(serializeTransaction),
    summary: {
      totalRevenue: completedAgg.total ?? 0,
      completedCount: completedAgg.count,
      pendingCount: statusCounts.PENDING || 0,
      failedCount: statusCounts.FAILED || 0,
      refundedCount: statusCounts.REFUNDED || 0,
      totalCount: statusGroups.reduce((sum, g) => sum + g.count, 0),
    },
    pagination: buildPaginationMeta(pageMeta.total, pagination.page, pagination.limit),
  };
};

export const getTransactionById = async (id) => {
  const payment = await aggregateOne(SaasPayment, {
    match: { _id: id },
    lookups: paymentLookups,
    project: paymentProject,
  });

  if (!payment) return null;
  return serializeTransaction(payment);
};
