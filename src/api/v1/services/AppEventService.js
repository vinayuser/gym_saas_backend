import { Event, EventBooking, Member } from '../../../schemas/index.js';
import { COLLECTIONS } from '../../../helpers/constants.js';
import { lookupOne, notDeleted } from '../../../helpers/query.js';
import { NotFoundError } from '../../../utils/errors.js';
import * as EventService from '../../../services/EventService.js';
import {
  toEventListItemDto,
  toEventDetailDto,
  toBookingConfirmedDto,
} from '../dto/event.dto.js';

const enrichEvents = async (gymId, memberId, match, { sort = { startAt: 1 }, limit = 50 } = {}) => {
  const events = await Event.aggregate([
    { $match: { gymId, isActive: true, ...notDeleted, ...match } },
    { $sort: sort },
    { $limit: limit },
    {
      $lookup: {
        from: COLLECTIONS.TRAINERS,
        let: { tid: '$trainerId' },
        pipeline: [
          { $match: { $expr: { $eq: ['$_id', '$$tid'] } } },
          ...lookupOne(COLLECTIONS.USERS, 'userId', 'user', { firstName: 1, lastName: 1 }),
        ],
        as: 'trainer',
      },
    },
    { $unwind: { path: '$trainer', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: COLLECTIONS.EVENT_BOOKINGS,
        localField: '_id',
        foreignField: 'eventId',
        as: 'bookings',
      },
    },
    {
      $project: {
        _id: 0,
        id: '$_id',
        title: 1,
        description: 1,
        type: 1,
        imageUrl: 1,
        startAt: 1,
        endAt: 1,
        location: 1,
        seatLimit: 1,
        price: 1,
        participantCount: { $size: '$bookings' },
        booked: {
          $gt: [
            {
              $size: {
                $filter: {
                  input: '$bookings',
                  as: 'b',
                  cond: { $eq: ['$$b.memberId', memberId] },
                },
              },
            },
            0,
          ],
        },
        trainerName: {
          $trim: {
            input: {
              $concat: [
                { $ifNull: ['$trainer.user.firstName', ''] },
                ' ',
                { $ifNull: ['$trainer.user.lastName', ''] },
              ],
            },
          },
        },
      },
    },
  ]);
  return events;
};

export const listEvents = async (member, { tab = 'upcoming' } = {}) => {
  const now = new Date();

  if (tab === 'joined' || tab === 'past') {
    const bookings = await EventBooking.aggregate([
      { $match: { memberId: member.id } },
      {
        $lookup: {
          from: COLLECTIONS.EVENTS,
          localField: 'eventId',
          foreignField: '_id',
          as: 'event',
        },
      },
      { $unwind: '$event' },
      {
        $match:
          tab === 'past'
            ? { 'event.endAt': { $lt: now } }
            : { 'event.startAt': { $gte: now } },
      },
      { $sort: { 'event.startAt': tab === 'past' ? -1 : 1 } },
      { $limit: 50 },
      {
        $project: {
          _id: 0,
          id: '$event._id',
          title: '$event.title',
          description: '$event.description',
          type: '$event.type',
          imageUrl: '$event.imageUrl',
          startAt: '$event.startAt',
          endAt: '$event.endAt',
          location: '$event.location',
          seatLimit: '$event.seatLimit',
          price: '$event.price',
          booked: { $literal: true },
          participantCount: { $literal: 0 },
          trainerName: { $literal: null },
        },
      },
    ]);

    return {
      tab,
      events: bookings.map((e) => toEventListItemDto(e, { booked: true })),
    };
  }

  const events = await enrichEvents(member.gymId, member.id, { startAt: { $gte: now } });
  return {
    tab: 'upcoming',
    events: events.map((e) => toEventListItemDto(e, { booked: e.booked })),
  };
};

export const getEvent = async (member, gym, eventId) => {
  const [event] = await enrichEvents(member.gymId, member.id, { _id: eventId }, { limit: 1 });
  if (!event) throw new NotFoundError('Event not found');

  const attendeeIds = await EventBooking.find({ eventId }).select('memberId').limit(20).lean();
  const previewMembers = await Member.find({
    _id: { $in: attendeeIds.map((a) => a.memberId) },
  })
    .select('firstName lastName profileImage')
    .limit(6)
    .lean();

  const attendeePreview = previewMembers.map((m) => ({
    firstName: m.firstName,
    lastName: m.lastName,
    name: `${m.firstName} ${m.lastName}`.trim(),
    profileImage: m.profileImage || null,
  }));

  return toEventDetailDto(event, {
    booked: event.booked,
    highlights: event.description
      ? event.description
          .split(/[.\n]/)
          .map((s) => s.trim())
          .filter(Boolean)
          .slice(0, 4)
      : [],
    attendeePreview: attendeePreview.slice(0, 2),
    attendeeExtraCount: Math.max(0, (event.participantCount || 0) - 2),
    coach: event.trainerName || 'Gym Team',
    coachTitle: event.trainerName ? 'Lead Coach' : null,
  });
};

export const bookEvent = async (member, gym, eventId) => {
  const tenantId = member.tenantId || gym.tenantId;
  const booking = await EventService.bookEvent(tenantId, member.gymId, eventId, member.id);
  const detail = await getEvent(member, gym, eventId);
  return toBookingConfirmedDto(detail, booking);
};

export const cancelEvent = async (member, gym, eventId) => {
  const tenantId = member.tenantId || gym.tenantId;
  await EventService.cancelBooking(tenantId, member.gymId, eventId, member.id);
  return { eventId, cancelled: true };
};
