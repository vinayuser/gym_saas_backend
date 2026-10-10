import { PAGE } from './constants.js';

export const notDeleted = { deletedAt: null };

export const textSearch = (q, fields) => {
  const value = q?.trim();
  if (!value || !fields?.length) return {};
  return { $or: fields.map((field) => ({ [field]: { $regex: value, $options: 'i' } })) };
};

export const pageParams = (query = {}) => {
  const page = Math.max(1, parseInt(query.page || '1', 10) || 1);
  const limit = Math.min(PAGE.MAX, Math.max(1, parseInt(query.limit || String(PAGE.DEFAULT), 10) || PAGE.DEFAULT));
  const sortBy = query.sortBy || 'createdAt';
  const sortDir = query.sortOrder === 'asc' ? 1 : -1;
  return {
    page,
    limit,
    skip: (page - 1) * limit,
    sort: { [sortBy]: sortDir },
    search: query.search?.trim() || '',
  };
};

export const lookupOne = (from, localField, as, project) => [
  {
    $lookup: {
      from,
      let: { fk: `$${localField}` },
      pipeline: [
        { $match: { $expr: { $eq: ['$_id', '$$fk'] } } },
        ...(project ? [{ $project: project }] : []),
      ],
      as,
    },
  },
  { $unwind: { path: `$${as}`, preserveNullAndEmptyArrays: true } },
];

export const lookupMany = (from, localField, foreignField, as, pipeline = []) => ({
  $lookup: {
    from,
    let: { fk: `$${localField}` },
    pipeline: [{ $match: { $expr: { $eq: [`$${foreignField}`, '$$fk'] } } }, ...pipeline],
    as,
  },
});
