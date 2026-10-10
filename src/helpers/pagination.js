import { PAGE, SORT } from './constants.js';
import { pageParams } from './query.js';

export const paginationMeta = (total, page, limit) => ({
  total,
  page,
  limit,
  totalPages: Math.ceil(total / limit) || 1,
  hasNext: page * limit < total,
  hasPrev: page > 1,
});

/**
 * One-round-trip list + total using $facet.
 * Joins in `lookups` run after skip/limit so only the page is hydrated.
 * Put filter-only stages in `before` (still inside the matched set).
 */
export const paginate = async (
  Model,
  { match = {}, before = [], lookups = [], project, sort = SORT.CREATED_DESC, page = 1, limit = PAGE.DEFAULT } = {}
) => {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(PAGE.MAX, Math.max(1, Number(limit) || PAGE.DEFAULT));
  const skip = (safePage - 1) * safeLimit;

  const [out] = await Model.aggregate([
    { $match: match },
    ...before,
    {
      $facet: {
        data: [
          { $sort: sort },
          { $skip: skip },
          { $limit: safeLimit },
          ...lookups,
          ...(project ? [{ $project: project }] : []),
        ],
        meta: [{ $count: 'total' }],
      },
    },
  ]);

  const total = out?.meta?.[0]?.total ?? 0;
  return { data: out?.data || [], pagination: paginationMeta(total, safePage, safeLimit) };
};

export const paginateFromQuery = (Model, query, options = {}) => {
  const { page, limit, sort, search } = pageParams(query);
  return paginate(Model, { ...options, page, limit, sort, search });
};

export const aggregateOne = async (Model, { match, lookups = [], project } = {}) => {
  const rows = await Model.aggregate([
    { $match: match },
    { $limit: 1 },
    ...lookups,
    ...(project ? [{ $project: project }] : []),
  ]);
  return rows[0] || null;
};

export const countDocuments = async (Model, match = {}) => Model.countDocuments(match);

export const groupCount = async (Model, { match = {}, by, extra = {} } = {}) =>
  Model.aggregate([{ $match: match }, { $group: { _id: `$${by}`, count: { $sum: 1 }, ...extra } }]);

export const sumField = async (Model, { match = {}, field } = {}) => {
  const [row] = await Model.aggregate([
    { $match: match },
    { $group: { _id: null, total: { $sum: `$${field}` }, count: { $sum: 1 } } },
  ]);
  return { total: row?.total ?? 0, count: row?.count ?? 0 };
};
