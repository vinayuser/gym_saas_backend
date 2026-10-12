import { Trainer, Event } from '../schemas/index.js';
import * as GymModel from '../models/GymModel.js';
import { paginate, countDocuments, aggregateOne } from '../helpers/pagination.js';
import { lookupOne } from '../helpers/query.js';
import { COLLECTIONS, SORT } from '../helpers/constants.js';
import { NotFoundError } from '../utils/errors.js';
import { parsePagination, buildPaginationMeta } from '../utils/response.js';

const staffLookup = {
  $lookup: {
    from: COLLECTIONS.GYM_STAFF,
    let: { uid: '$userId', gid: '$gymId' },
    pipeline: [
      {
        $match: {
          $expr: {
            $and: [{ $eq: ['$userId', '$$uid'] }, { $eq: ['$gymId', '$$gid'] }],
          },
        },
      },
      { $project: { _id: 1 } },
      { $limit: 1 },
    ],
    as: '_staff',
  },
};

const trainerProject = {
  _id: 0,
  id: '$_id',
  name: {
    $trim: {
      input: {
        $concat: [{ $ifNull: ['$user.firstName', ''] }, ' ', { $ifNull: ['$user.lastName', ''] }],
      },
    },
  },
  email: '$user.email',
  phone: '$user.phone',
  avatar: '$user.avatar',
  bio: 1,
  specialties: 1,
  experience: 1,
  isActive: 1,
  sessions: 1,
  staffId: { $arrayElemAt: ['$_staff._id', 0] },
};

const mapTrainer = (t) => ({
  id: t.id,
  name: t.name,
  email: t.email,
  phone: t.phone || null,
  avatar: t.avatar || null,
  bio: t.bio || null,
  experience: t.experience ?? null,
  specialties: t.specialties || [],
  clients: t.sessions || 0,
  sessions: t.sessions || 0,
  rating: 4.5 + Math.min((t.experience || 0) / 20, 0.5),
  status: t.isActive ? 'ACTIVE' : 'INACTIVE',
  staffId: t.staffId || null,
});

export const performance = async (tenantId, gymId, query = {}) => {
  const gym = await GymModel.findById(gymId, tenantId);
  if (!gym) throw new NotFoundError('Gym not found');

  const pagination = parsePagination(query);
  const match = { gymId, isActive: true };
  const search = (pagination.search || '').trim();

  const [{ data: trainers, pagination: pageMeta }, activeTrainers, sessionAgg] = await Promise.all([
    paginate(Trainer, {
      match,
      before: search
        ? [
            ...lookupOne(COLLECTIONS.USERS, 'userId', '_searchUser', {
              firstName: 1,
              lastName: 1,
              email: 1,
            }),
            {
              $match: {
                $or: [
                  { '_searchUser.firstName': { $regex: search, $options: 'i' } },
                  { '_searchUser.lastName': { $regex: search, $options: 'i' } },
                  { '_searchUser.email': { $regex: search, $options: 'i' } },
                ],
              },
            },
          ]
        : [],
      lookups: [
        ...lookupOne(COLLECTIONS.USERS, 'userId', 'user', {
          _id: 0,
          id: '$_id',
          firstName: 1,
          lastName: 1,
          email: 1,
          phone: 1,
          avatar: 1,
        }),
        {
          $lookup: {
            from: COLLECTIONS.EVENTS,
            let: { tid: '$_id' },
            pipeline: [
              { $match: { $expr: { $eq: ['$trainerId', '$$tid'] } } },
              {
                $lookup: {
                  from: COLLECTIONS.EVENT_BOOKINGS,
                  localField: '_id',
                  foreignField: 'eventId',
                  as: 'bookings',
                },
              },
              { $project: { bookingCount: { $size: '$bookings' } } },
            ],
            as: 'events',
          },
        },
        { $addFields: { sessions: { $sum: '$events.bookingCount' } } },
        staffLookup,
      ],
      project: trainerProject,
      sort: SORT.CREATED_DESC,
      page: pagination.page,
      limit: pagination.limit,
    }),
    countDocuments(Trainer, match),
    Event.aggregate([
      { $match: { gymId } },
      {
        $lookup: {
          from: COLLECTIONS.EVENT_BOOKINGS,
          localField: '_id',
          foreignField: 'eventId',
          as: 'bookings',
        },
      },
      { $group: { _id: null, count: { $sum: { $size: '$bookings' } } } },
    ]),
  ]);

  const sessionRows = sessionAgg[0]?.count || 0;

  return {
    summary: {
      activeTrainers,
      avgRating: activeTrainers ? 4.8 : 0,
      totalSessions: sessionRows,
      efficiency: activeTrainers ? 86 : 0,
    },
    trainers: trainers.map(mapTrainer),
    pagination: buildPaginationMeta(pageMeta.total, pagination.page, pagination.limit),
  };
};

export const getById = async (tenantId, gymId, trainerId) => {
  const gym = await GymModel.findById(gymId, tenantId);
  if (!gym) throw new NotFoundError('Gym not found');

  const trainer = await aggregateOne(Trainer, {
    match: { _id: trainerId, gymId },
    lookups: [
      ...lookupOne(COLLECTIONS.USERS, 'userId', 'user', {
        _id: 0,
        id: '$_id',
        firstName: 1,
        lastName: 1,
        email: 1,
        phone: 1,
        avatar: 1,
      }),
      {
        $lookup: {
          from: COLLECTIONS.EVENTS,
          let: { tid: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$trainerId', '$$tid'] } } },
            {
              $lookup: {
                from: COLLECTIONS.EVENT_BOOKINGS,
                localField: '_id',
                foreignField: 'eventId',
                as: 'bookings',
              },
            },
            { $project: { bookingCount: { $size: '$bookings' } } },
          ],
          as: 'events',
        },
      },
      { $addFields: { sessions: { $sum: '$events.bookingCount' } } },
      staffLookup,
    ],
    project: trainerProject,
  });

  if (!trainer) throw new NotFoundError('Trainer not found');
  return mapTrainer(trainer);
};
