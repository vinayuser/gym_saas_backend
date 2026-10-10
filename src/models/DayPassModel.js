import { DayPass } from '../schemas/index.js';
import { paginate, aggregateOne, sumField } from '../helpers/pagination.js';
import { createDoc, updateById } from '../helpers/document.js';
import { PAGE, SORT } from '../helpers/constants.js';
import { textSearch } from '../helpers/query.js';
import { dayPassPublic } from '../projections/ops.projection.js';

const rangeMatch = (gymId, { from, to, date } = {}) => {
  if (date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { gymId, deletedAt: null, validOn: { $gte: start, $lt: end } };
  }
  return {
    gymId,
    deletedAt: null,
    ...(from || to
      ? { validOn: { ...(from ? { $gte: new Date(from) } : {}), ...(to ? { $lte: new Date(to) } : {}) } }
      : {}),
  };
};

export const todayStats = async (gymId) => {
  const summary = await stats(gymId, { date: new Date() });
  return { total: summary.total, checkedIn: summary.checkedIn, amount: summary.amount };
};

export const findMany = async (gymId, { skip, limit, from, to, date, search } = {}) => {
  const { data, pagination } = await paginate(DayPass, {
    match: {
      ...rangeMatch(gymId, { from, to, date }),
      ...textSearch(search, ['guestName', 'phone', 'email']),
    },
    project: dayPassPublic,
    sort: SORT.CREATED_DESC,
    page: Math.floor((skip || 0) / (limit || PAGE.DEFAULT)) + 1,
    limit: limit || PAGE.DEFAULT,
  });
  return [data, pagination.total];
};

export const findById = (id, gymId) =>
  aggregateOne(DayPass, { match: { _id: id, gymId }, project: dayPassPublic });

export const create = (data) => createDoc(DayPass, data);
export const update = (id, data) => updateById(DayPass, id, data);

export const stats = async (gymId, query = {}) => {
  const match = rangeMatch(gymId, query);
  const [out] = await DayPass.aggregate([
    { $match: match },
    {
      $facet: {
        total: [{ $count: 'n' }],
        checkedIn: [{ $match: { checkedInAt: { $ne: null } } }, { $count: 'n' }],
        amount: [{ $group: { _id: null, total: { $sum: '$amount' } } }],
      },
    },
  ]);
  return {
    total: out?.total?.[0]?.n || 0,
    checkedIn: out?.checkedIn?.[0]?.n || 0,
    amount: out?.amount?.[0]?.total || 0,
  };
};
