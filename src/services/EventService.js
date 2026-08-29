import * as EventModel from '../models/EventModel.js';
import * as GymModel from '../models/GymModel.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import { parsePagination, buildPaginationMeta } from '../utils/response.js';
import { generateEventOccurrences, newSeriesId } from '../utils/eventRecurrenceUtils.js';

const validateGym = async (tenantId, gymId) => {
  const gym = await GymModel.findById(gymId, tenantId);
  if (!gym) throw new NotFoundError('Gym not found');
  return gym;
};

const mapEvent = (e) => ({
  ...e,
  participantCount: e._count?.bookings ?? 0,
  trainerName: e.trainer?.user
    ? `${e.trainer.user.firstName} ${e.trainer.user.lastName}`.trim()
    : null,
});

const sharedEventFields = (body, gymId) => ({
  gymId,
  trainerId: body.trainerId || null,
  title: body.title,
  description: body.description || null,
  type: body.type || 'OTHER',
  imageUrl: body.imageUrl || null,
  location: body.location || null,
  seatLimit: body.seatLimit ?? null,
  price: body.price ?? null,
  isActive: body.isActive !== false,
});

export const list = async (tenantId, gymId, query) => {
  await validateGym(tenantId, gymId);
  const pagination = parsePagination(query);
  const calendarMode = Boolean(query.from && query.to);
  const limit = calendarMode
    ? Math.min(500, Math.max(1, parseInt(query.limit || '500', 10)))
    : pagination.limit;

  const [rows, total] = await EventModel.findMany(gymId, {
    skip: calendarMode ? 0 : pagination.skip,
    limit,
    search: pagination.search,
    upcoming: query.upcoming === 'true',
    from: query.from,
    to: query.to,
  });
  return {
    events: rows.map(mapEvent),
    pagination: buildPaginationMeta(total, calendarMode ? 1 : pagination.page, limit),
  };
};

export const getById = async (tenantId, gymId, eventId) => {
  await validateGym(tenantId, gymId);
  const event = await EventModel.findById(eventId, gymId);
  if (!event) throw new NotFoundError('Event not found');
  return mapEvent(event);
};

export const create = async (tenantId, gymId, body) => {
  await validateGym(tenantId, gymId);

  let occurrences;
  try {
    occurrences = generateEventOccurrences(body);
  } catch (err) {
    throw new ValidationError(err.message);
  }

  const recurrence = body.recurrence || 'NONE';
  const seriesId = recurrence !== 'NONE' ? newSeriesId() : null;
  const base = sharedEventFields(body, gymId);

  const records = occurrences.map(({ startAt, endAt }) => ({
    ...base,
    seriesId,
    recurrence: 'NONE',
    recurrenceEndAt: null,
    recurrenceWeekdays: [],
    recurrenceWeekOfMonth: null,
    recurrenceDayOfWeek: null,
    startAt,
    endAt,
  }));

  const created = await EventModel.createMany(records);
  const first = created[0];

  return {
    ...mapEvent(first),
    seriesId,
    occurrencesCreated: created.length,
  };
};

export const update = async (tenantId, gymId, eventId, body) => {
  await validateGym(tenantId, gymId);
  const existing = await EventModel.findById(eventId, gymId);
  if (!existing) throw new NotFoundError('Event not found');
  await EventModel.update(eventId, {
    ...(body.trainerId !== undefined && { trainerId: body.trainerId }),
    ...(body.title !== undefined && { title: body.title }),
    ...(body.description !== undefined && { description: body.description }),
    ...(body.type !== undefined && { type: body.type }),
    ...(body.imageUrl !== undefined && { imageUrl: body.imageUrl }),
    ...(body.startAt !== undefined && { startAt: new Date(body.startAt) }),
    ...(body.endAt !== undefined && { endAt: new Date(body.endAt) }),
    ...(body.location !== undefined && { location: body.location }),
    ...(body.seatLimit !== undefined && { seatLimit: body.seatLimit }),
    ...(body.price !== undefined && { price: body.price }),
    ...(body.isActive !== undefined && { isActive: body.isActive }),
  });
  return getById(tenantId, gymId, eventId);
};

export const remove = async (tenantId, gymId, eventId) => {
  await validateGym(tenantId, gymId);
  const existing = await EventModel.findById(eventId, gymId);
  if (!existing) throw new NotFoundError('Event not found');
  await EventModel.remove(eventId);
  return { message: 'Event deleted successfully' };
};

export const removeSeries = async (tenantId, gymId, seriesId) => {
  await validateGym(tenantId, gymId);
  const result = await EventModel.removeBySeriesId(seriesId, gymId);
  return { message: `Deleted ${result.count} events`, count: result.count };
};
