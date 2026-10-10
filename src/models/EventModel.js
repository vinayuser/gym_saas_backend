import { Event } from '../schemas/index.js';
import { paginate, aggregateOne } from '../helpers/pagination.js';
import { createDoc, updateById, asDoc } from '../helpers/document.js';
import { lookupOne, lookupMany, textSearch } from '../helpers/query.js';
import { COLLECTIONS, PAGE, SORT } from '../helpers/constants.js';
import { eventPublic } from '../projections/ops.projection.js';
import { userBrief } from '../projections/user.projection.js';

const eventLookups = [
  {
    $lookup: {
      from: COLLECTIONS.TRAINERS,
      let: { tid: '$trainerId' },
      pipeline: [
        { $match: { $expr: { $eq: ['$_id', '$$tid'] } } },
        ...lookupOne(COLLECTIONS.USERS, 'userId', 'user', { _id: 0, id: '$_id', firstName: 1, lastName: 1 }),
        { $project: { _id: 0, id: '$_id', userId: 1, user: 1 } },
      ],
      as: 'trainer',
    },
  },
  { $unwind: { path: '$trainer', preserveNullAndEmptyArrays: true } },
  lookupMany(COLLECTIONS.EVENT_BOOKINGS, '_id', 'eventId', '_bookings', [{ $project: { _id: 1 } }]),
  { $addFields: { _count: { bookings: { $size: '$_bookings' } } } },
];

const listMatch = (gymId, { search, upcoming, from, to }) => {
  const now = new Date();
  return {
    gymId,
    ...textSearch(search, ['title']),
    ...(upcoming ? { startAt: { $gte: now } } : {}),
    ...(from || to
      ? { startAt: { ...(from ? { $gte: new Date(from) } : {}), ...(to ? { $lte: new Date(to) } : {}) } }
      : {}),
  };
};

export const findMany = async (gymId, { skip, limit, search, upcoming, from, to }) => {
  const { data, pagination } = await paginate(Event, {
    match: listMatch(gymId, { search, upcoming, from, to }),
    lookups: eventLookups,
    project: eventPublic,
    sort: SORT.START_ASC,
    page: Math.floor((skip || 0) / (limit || PAGE.DEFAULT)) + 1,
    limit: limit || PAGE.DEFAULT,
  });
  return [data, pagination.total];
};

export const findById = (id, gymId) =>
  aggregateOne(Event, { match: { _id: id, gymId }, lookups: eventLookups, project: eventPublic });

export const create = (data) => createDoc(Event, data);

export const createMany = async (records) => {
  const docs = await Event.insertMany(records);
  return Promise.all(docs.map((doc) => findById(doc._id, doc.gymId)));
};

export const update = (id, data) => updateById(Event, id, data);
export const remove = async (id) => asDoc(await Event.findByIdAndDelete(id));
export const removeBySeriesId = (seriesId, gymId) => Event.deleteMany({ seriesId, gymId });
