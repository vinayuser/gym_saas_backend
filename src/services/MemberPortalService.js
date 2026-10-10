import {
  Member,
  Attendance,
  Banner,
  Event,
  Product,
  ProductCategory,
  GymChatMessage,
  User,
} from '../schemas/index.js';
import * as EventService from './EventService.js';
import * as EventBookingModel from '../models/EventBookingModel.js';
import * as OrderService from './OrderService.js';
import * as MemberCareModel from '../models/MemberCareModel.js';
import { aggregateOne } from '../helpers/pagination.js';
import { createDoc, updateById, asDoc } from '../helpers/document.js';
import { lookupOne, notDeleted } from '../helpers/query.js';
import { COLLECTIONS, SORT } from '../helpers/constants.js';
import { gymPublic } from '../projections/gym.projection.js';
import { NotFoundError, ForbiddenError, BadRequestError } from '../utils/errors.js';

const getLinkedMember = async (userId) => {
  const member = await aggregateOne(Member, {
    match: { userId, ...notDeleted },
    lookups: [
      ...lookupOne(COLLECTIONS.GYMS, 'gymId', 'gym', {
        ...gymPublic,
        tenantId: 1,
      }),
      {
        $lookup: {
          from: COLLECTIONS.MEMBERSHIPS,
          let: { mid: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$memberId', '$$mid'] } } },
            { $sort: { endDate: -1 } },
            { $limit: 3 },
            ...lookupOne(COLLECTIONS.GYM_MEMBERSHIP_PLANS, 'planId', 'plan', {
              _id: 0,
              id: '$_id',
              name: 1,
              durationDays: 1,
              price: 1,
              billingCycle: 1,
              description: 1,
            }),
            {
              $project: {
                _id: 0,
                id: '$_id',
                status: 1,
                startDate: 1,
                endDate: 1,
                amountPaid: 1,
                plan: 1,
              },
            },
          ],
          as: 'memberships',
        },
      },
    ],
    project: {
      _id: 0,
      id: '$_id',
      gymId: 1,
      userId: 1,
      memberCode: 1,
      firstName: 1,
      lastName: 1,
      email: 1,
      phone: 1,
      profileImage: 1,
      qrCode: 1,
      fitnessGoals: 1,
      emergencyContact: 1,
      emergencyPhone: 1,
      joinedAt: 1,
      gym: 1,
      memberships: 1,
    },
  });
  if (!member) throw new NotFoundError('No member profile linked to this account');
  return member;
};

const mapMembership = (row) =>
  row
    ? {
        id: row.id,
        status: row.status,
        startDate: row.startDate,
        endDate: row.endDate,
        amountPaid: row.amountPaid != null ? Number(row.amountPaid) : null,
        plan: row.plan
          ? {
              id: row.plan.id,
              name: row.plan.name,
              durationDays: row.plan.durationDays,
              price: Number(row.plan.price),
              billingCycle: row.plan.billingCycle,
              description: row.plan.description,
            }
          : null,
      }
    : null;

export const getMyMemberProfile = async (userId) => {
  const member = await getLinkedMember(userId);
  const activeMembership = member.memberships.find((m) => m.status === 'ACTIVE') || member.memberships[0] || null;

  return {
    member: {
      id: member.id,
      memberCode: member.memberCode,
      firstName: member.firstName,
      lastName: member.lastName,
      email: member.email,
      phone: member.phone,
      profileImage: member.profileImage,
      qrCode: member.qrCode || member.memberCode,
      fitnessGoals: member.fitnessGoals,
      emergencyContact: member.emergencyContact,
      emergencyPhone: member.emergencyPhone,
      joinedAt: member.joinedAt,
    },
    gym: member.gym,
    membership: mapMembership(activeMembership),
    memberships: member.memberships.map(mapMembership),
  };
};

export const updateMyProfile = async (userId, body) => {
  const member = await getLinkedMember(userId);
  const updated = await updateById(Member, member.id, {
    ...(body.firstName !== undefined && { firstName: body.firstName }),
    ...(body.lastName !== undefined && { lastName: body.lastName }),
    ...(body.phone !== undefined && { phone: body.phone }),
    ...(body.emergencyContact !== undefined && { emergencyContact: body.emergencyContact }),
    ...(body.emergencyPhone !== undefined && { emergencyPhone: body.emergencyPhone }),
    ...(body.fitnessGoals !== undefined && { fitnessGoals: body.fitnessGoals }),
    ...(body.profileImage !== undefined && { profileImage: body.profileImage }),
  });
  return getMyMemberProfile(updated.userId || userId);
};

export const getMyAttendance = async (userId, { limit = 20 } = {}) => {
  const member = await getLinkedMember(userId);
  const rows = await Attendance.aggregate([
    { $match: { memberId: member.id } },
    { $sort: { checkInAt: -1 } },
    { $limit: Math.min(Number(limit) || 20, 50) },
    {
      $project: {
        _id: 0,
        id: '$_id',
        checkInAt: 1,
        checkOutAt: 1,
        type: 1,
        source: 1,
      },
    },
  ]);
  return { attendance: rows };
};

export const checkInSelf = async (userId) => {
  const member = await getLinkedMember(userId);
  const { checkIn } = await import('./AttendanceService.js');
  return checkIn(member.gym.tenantId, member.gymId, {
    memberId: member.id,
    source: 'MOBILE',
  });
};

export const home = async (userId) => {
  const profile = await getMyMemberProfile(userId);
  const member = await getLinkedMember(userId);
  const now = new Date();

  const [banners, events, attendance, workouts, diets] = await Promise.all([
    Banner.aggregate([
      {
        $match: {
          gymId: member.gymId,
          isActive: true,
          $and: [
            { $or: [{ startDate: null }, { startDate: { $lte: now } }] },
            { $or: [{ endDate: null }, { endDate: { $gte: now } }] },
          ],
        },
      },
      { $sort: SORT.CREATED_DESC },
      { $limit: 6 },
      {
        $project: {
          _id: 0,
          id: '$_id',
          gymId: 1,
          name: 1,
          category: 1,
          placement: 1,
          imageUrl: 1,
          startDate: 1,
          endDate: 1,
          ctaType: 1,
          ctaDestination: 1,
          isActive: 1,
        },
      },
    ]),
    Event.aggregate([
      { $match: { gymId: member.gymId, isActive: true, startAt: { $gte: now } } },
      { $sort: { startAt: 1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: COLLECTIONS.EVENT_BOOKINGS,
          localField: '_id',
          foreignField: 'eventId',
          as: 'bookings',
        },
      },
      {
        $addFields: {
          id: '$_id',
          participantCount: { $size: '$bookings' },
        },
      },
      { $project: { _id: 0, bookings: 0 } },
    ]),
    Attendance.aggregate([
      { $match: { memberId: member.id } },
      { $sort: { checkInAt: -1 } },
      { $limit: 3 },
      {
        $project: {
          _id: 0,
          id: '$_id',
          gymId: 1,
          memberId: 1,
          type: 1,
          source: 1,
          checkInAt: 1,
          checkOutAt: 1,
        },
      },
    ]),
    MemberCareModel.listWorkouts(member.id),
    MemberCareModel.listDiets(member.id),
  ]);

  return {
    ...profile,
    banners,
    upcomingEvents: events,
    recentAttendance: attendance,
    activeWorkout: workouts.find((w) => w.isActive) || null,
    activeDiet: diets.find((d) => d.isActive) || null,
  };
};

export const listBanners = async (userId) => {
  const member = await getLinkedMember(userId);
  const now = new Date();
  const banners = await Banner.aggregate([
    {
      $match: {
        gymId: member.gymId,
        isActive: true,
        $and: [
          { $or: [{ startDate: null }, { startDate: { $lte: now } }] },
          { $or: [{ endDate: null }, { endDate: { $gte: now } }] },
        ],
      },
    },
    { $sort: SORT.CREATED_DESC },
    {
      $project: {
        _id: 0,
        id: '$_id',
        gymId: 1,
        name: 1,
        category: 1,
        placement: 1,
        imageUrl: 1,
        startDate: 1,
        endDate: 1,
        ctaType: 1,
        ctaDestination: 1,
        isActive: 1,
      },
    },
  ]);
  return { banners };
};

export const listEvents = async (userId) => {
  const member = await getLinkedMember(userId);
  const events = await Event.aggregate([
    { $match: { gymId: member.gymId, isActive: true, startAt: { $gte: new Date() } } },
    { $sort: { startAt: 1 } },
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
        gymId: 1,
        trainerId: 1,
        title: 1,
        description: 1,
        type: 1,
        imageUrl: 1,
        recurrence: 1,
        startAt: 1,
        endAt: 1,
        location: 1,
        seatLimit: 1,
        price: 1,
        isActive: 1,
        createdAt: 1,
        updatedAt: 1,
        participantCount: { $size: '$bookings' },
        booked: {
          $gt: [
            {
              $size: {
                $filter: {
                  input: '$bookings',
                  as: 'b',
                  cond: { $eq: ['$$b.memberId', member.id] },
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
  return { events };
};

export const bookEvent = async (userId, eventId) => {
  const member = await getLinkedMember(userId);
  return EventService.bookEvent(member.gym.tenantId, member.gymId, eventId, member.id);
};

export const cancelEvent = async (userId, eventId) => {
  const member = await getLinkedMember(userId);
  return EventService.cancelBooking(member.gym.tenantId, member.gymId, eventId, member.id);
};

export const myBookings = async (userId) => {
  const member = await getLinkedMember(userId);
  const all = await EventBookingModel.listByMember(member.id);
  const now = new Date();
  const bookings = all.filter((b) => !b.event?.startAt || new Date(b.event.startAt) >= now);
  return { bookings };
};

export const listProducts = async (userId) => {
  const member = await getLinkedMember(userId);
  const [products, categories] = await Promise.all([
    Product.aggregate([
      { $match: { gymId: member.gymId, isActive: true, ...notDeleted } },
      { $sort: { name: 1 } },
      ...lookupOne(COLLECTIONS.PRODUCT_CATEGORIES, 'categoryId', 'category', {
        _id: 0,
        id: '$_id',
        name: 1,
      }),
      {
        $project: {
          _id: 0,
          id: '$_id',
          gymId: 1,
          categoryId: 1,
          name: 1,
          description: 1,
          sku: 1,
          barcode: 1,
          price: 1,
          stockQty: 1,
          images: 1,
          isActive: 1,
          category: 1,
        },
      },
    ]),
    ProductCategory.aggregate([
      { $match: { gymId: member.gymId } },
      { $sort: { name: 1 } },
      { $project: { _id: 0, id: '$_id', gymId: 1, name: 1, createdAt: 1 } },
    ]),
  ]);
  return {
    products: products.map((p) => ({ ...p, price: Number(p.price) })),
    categories,
  };
};

export const placeOrder = async (userId, body) => {
  const member = await getLinkedMember(userId);
  if (!body?.items?.length) throw new BadRequestError('Add at least one product');
  return OrderService.create(member.gym.tenantId, member.gymId, {
    memberId: member.id,
    items: body.items,
    notes: body.notes,
    fulfillmentType: body.fulfillmentType || 'PICKUP',
  });
};

export const myOrders = async (userId) => {
  const member = await getLinkedMember(userId);
  return OrderService.listForMember(member.gym.tenantId, member.gymId, member.id, { limit: 50 });
};

export const myPlans = async (userId) => {
  const member = await getLinkedMember(userId);
  const [workouts, diets, measurements] = await Promise.all([
    MemberCareModel.listWorkouts(member.id),
    MemberCareModel.listDiets(member.id),
    MemberCareModel.listMeasurements(member.id),
  ]);
  return { workouts, diets, measurements };
};

export const addMeasurement = async (userId, body) => {
  const member = await getLinkedMember(userId);
  return MemberCareModel.createMeasurement({
    memberId: member.id,
    weight: body.weight ?? null,
    height: body.height ?? null,
    chest: body.chest ?? null,
    waist: body.waist ?? null,
    hips: body.hips ?? null,
    biceps: body.biceps ?? null,
    thighs: body.thighs ?? null,
    bodyFat: body.bodyFat ?? null,
    notes: body.notes || null,
    measuredAt: body.measuredAt ? new Date(body.measuredAt) : new Date(),
  });
};

const mapChatMessage = (m, userId) => ({
  ...m,
  isOwn: m.senderId === userId,
  sender: m.sender
    ? { ...m.sender, name: `${m.sender.firstName} ${m.sender.lastName}`.trim() }
    : null,
});

export const gymChat = async (userId, limit = 40) => {
  const member = await getLinkedMember(userId);
  const messages = await GymChatMessage.aggregate([
    { $match: { gymId: member.gymId, ...notDeleted } },
    { $sort: SORT.CREATED_DESC },
    { $limit: Math.min(Number(limit) || 40, 80) },
    { $sort: { createdAt: 1 } },
    ...lookupOne(COLLECTIONS.USERS, 'senderId', 'sender', {
      _id: 0,
      id: '$_id',
      firstName: 1,
      lastName: 1,
      role: 1,
      avatar: 1,
    }),
    {
      $project: {
        _id: 0,
        id: '$_id',
        gymId: 1,
        senderId: 1,
        content: 1,
        mediaUrl: 1,
        mediaType: 1,
        isPinned: 1,
        pinnedAt: 1,
        pinnedById: 1,
        editedAt: 1,
        createdAt: 1,
        updatedAt: 1,
        sender: 1,
      },
    },
  ]);
  return {
    gymId: member.gymId,
    messages: messages.map((m) => mapChatMessage(m, userId)),
  };
};

export const sendChat = async (userId, body) => {
  const member = await getLinkedMember(userId);
  if (!body?.content && !body?.mediaUrl) throw new BadRequestError('Message is empty');
  const message = await createDoc(GymChatMessage, {
    gymId: member.gymId,
    senderId: userId,
    content: body.content || '',
    mediaUrl: body.mediaUrl || null,
    mediaType: body.mediaType || null,
  });
  const sender = asDoc(await User.findById(userId).select('firstName lastName role avatar'));
  return mapChatMessage(
    {
      ...message,
      sender: sender
        ? {
            id: sender.id,
            firstName: sender.firstName,
            lastName: sender.lastName,
            role: sender.role,
            avatar: sender.avatar,
          }
        : null,
    },
    userId
  );
};

export const ensureMemberRole = (user) => {
  if (!user) throw new ForbiddenError('Unauthorized');
};
