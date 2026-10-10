import { EventBooking } from '../schemas/index.js';
import { createDoc, asDoc } from '../helpers/document.js';
import { lookupOne } from '../helpers/query.js';
import { COLLECTIONS } from '../helpers/constants.js';
import { memberBrief } from '../projections/member.projection.js';

const withMember = lookupOne(COLLECTIONS.MEMBERS, 'memberId', 'member', memberBrief);

export const listByEvent = (eventId) =>
  EventBooking.aggregate([
    { $match: { eventId } },
    ...withMember,
    { $project: { _id: 0, id: '$_id', eventId: 1, memberId: 1, status: 1, bookedAt: 1, member: 1 } },
  ]);

export const listByMember = (memberId) =>
  EventBooking.aggregate([
    { $match: { memberId } },
    {
      $lookup: {
        from: COLLECTIONS.EVENTS,
        localField: 'eventId',
        foreignField: '_id',
        as: 'event',
      },
    },
    { $unwind: { path: '$event', preserveNullAndEmptyArrays: true } },
    { $addFields: { id: '$_id', 'event.id': '$event._id' } },
    { $project: { _id: 0 } },
  ]);

export const findByEventMember = async (eventId, memberId) =>
  asDoc(await EventBooking.findOne({ eventId, memberId }));

export const create = (data) => createDoc(EventBooking, data);

export const remove = (id) => EventBooking.findByIdAndDelete(id);

export const countByEvent = (eventId) => EventBooking.countDocuments({ eventId });
