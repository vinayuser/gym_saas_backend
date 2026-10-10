import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import {
  Attendance,
  Event,
  EventBooking,
  GymChatMessage,
  Member,
  User,
} from '../../../schemas/index.js';
import env from '../../../config/env.js';
import { asDoc, updateById } from '../../../helpers/document.js';
import { COLLECTIONS, SORT } from '../../../helpers/constants.js';
import { lookupOne, notDeleted } from '../../../helpers/query.js';
import { BadRequestError } from '../../../utils/errors.js';
import { loadActiveMembership } from './memberContext.js';
import {
  toProfileDto,
  toAttendanceSummaryDto,
  toCheckInPassDto,
  toGymTimingDto,
  toGymSummaryDto,
} from '../dto/member.dto.js';
import { toEventListItemDto } from '../dto/event.dto.js';
import { toChatMessageDto } from '../dto/event.dto.js';
import { toNotificationSettingsDto } from '../dto/notification.dto.js';
import * as AuthService from '../../../services/AuthService.js';

const QR_TTL_SEC = 5 * 60;
const MONTHLY_TARGET = 15;

const weekBarsFromAttendance = (rows) => {
  const labels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const counts = [0, 0, 0, 0, 0, 0, 0];
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  start.setHours(0, 0, 0, 0);

  for (const row of rows) {
    if (!row.checkInAt) continue;
    const d = new Date(row.checkInAt);
    if (d < start) continue;
    const idx = (d.getDay() + 6) % 7;
    counts[idx] += 1;
  }

  return labels.map((label, i) => ({ day: label, count: counts[i], attended: counts[i] > 0 }));
};

const eventListProjection = async (gymId, memberId, match, limit = 20) => {
  const events = await Event.aggregate([
    { $match: { gymId, isActive: true, ...match } },
    { $sort: { startAt: 1 } },
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
  return events.map((e) => toEventListItemDto(e, { booked: e.booked }));
};

export const getHome = async (member, gym) => {
  const membership = await loadActiveMembership(member.id);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [upcomingEvents, joinedBookings, monthAttendance, recentChat] = await Promise.all([
    eventListProjection(member.gymId, member.id, { startAt: { $gte: now } }, 4),
    EventBooking.aggregate([
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
      { $sort: { 'event.startAt': 1 } },
      { $limit: 10 },
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
    ]),
    Attendance.find({ memberId: member.id, checkInAt: { $gte: monthStart } })
      .select('checkInAt checkOutAt type source')
      .sort({ checkInAt: -1 })
      .lean(),
    GymChatMessage.aggregate([
      { $match: { gymId: member.gymId, ...notDeleted } },
      { $sort: SORT.CREATED_DESC },
      { $limit: 1 },
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
          createdAt: 1,
          sender: 1,
        },
      },
    ]),
  ]);

  const joinedEvents = joinedBookings.map((e) => toEventListItemDto(e, { booked: true }));
  const attendanceRows = monthAttendance.map((r) => ({
    id: r._id,
    checkInAt: r.checkInAt,
    checkOutAt: r.checkOutAt,
    type: r.type,
    source: r.source,
  }));

  const uniqueDays = new Set(
    attendanceRows.map((r) => new Date(r.checkInAt).toISOString().slice(0, 10))
  );

  const lastMessage = recentChat[0] ? toChatMessageDto(recentChat[0], member.userId) : null;

  return {
    greeting: {
      firstName: member.firstName,
      fullName: `${member.firstName} ${member.lastName}`.trim(),
      profileImage: member.profileImage || null,
      hasUnreadNotifications: true,
    },
    subscription: membership
      ? {
          planName: membership.planName,
          status: membership.status,
          nextPaymentAmount: membership.nextPaymentAmount,
          dueDate: membership.dueDate,
        }
      : null,
    currentSlot: member.preferredSlot || {
      label: 'Morning slot',
      startTime: '6:00 AM',
      endTime: '7:00 AM',
      days: 'Mon–Fri',
    },
    upcomingEvents,
    joinedEvents: joinedEvents.slice(0, 4),
    attendance: toAttendanceSummaryDto({
      daysAttended: uniqueDays.size,
      monthlyTarget: MONTHLY_TARGET,
      weekBars: weekBarsFromAttendance(attendanceRows),
      visits: attendanceRows.slice(0, 5),
    }),
    chatPreview: {
      channelName: 'Community Chat',
      lastMessage,
      unreadCount: 0,
    },
    gym: toGymSummaryDto(gym),
  };
};

export const getProfile = async (member, gym, user) => {
  const membership = await loadActiveMembership(member.id);
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const visits = await Attendance.countDocuments({
    memberId: member.id,
    checkInAt: { $gte: monthStart },
  });

  return toProfileDto(member, gym, membership, {
    emailVerified: Boolean(user?.emailVerified),
    workouts: visits,
    streak: Math.min(visits, 30),
    fitPoints: visits * 25,
  });
};

export const updateProfile = async (member, gym, user, body) => {
  const updated = await updateById(Member, member.id, {
    ...(body.firstName !== undefined && { firstName: body.firstName }),
    ...(body.lastName !== undefined && { lastName: body.lastName }),
    ...(body.phone !== undefined && { phone: body.phone }),
    ...(body.profileImage !== undefined && { profileImage: body.profileImage }),
    ...(body.emergencyContact !== undefined && { emergencyContact: body.emergencyContact }),
    ...(body.emergencyPhone !== undefined && { emergencyPhone: body.emergencyPhone }),
    ...(body.fitnessGoals !== undefined && { fitnessGoals: body.fitnessGoals }),
  });
  return getProfile(updated, gym, user);
};

export const getMembership = async (member) => {
  const membership = await loadActiveMembership(member.id);
  if (!membership) {
    return { membership: null };
  }
  return { membership };
};

export const getAttendance = async (member, { month } = {}) => {
  let start;
  let end;
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [y, m] = month.split('-').map(Number);
    start = new Date(y, m - 1, 1);
    end = new Date(y, m, 1);
  } else {
    const now = new Date();
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  }

  const rows = await Attendance.find({
    memberId: member.id,
    checkInAt: { $gte: start, $lt: end },
  })
    .sort({ checkInAt: -1 })
    .lean();

  const visits = rows.map((r) => ({
    id: r._id,
    checkInAt: r.checkInAt,
    checkOutAt: r.checkOutAt,
    type: r.type || 'Regular Workout',
    source: r.source,
  }));

  const uniqueDays = new Set(visits.map((r) => new Date(r.checkInAt).toISOString().slice(0, 10)));

  return {
    month: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`,
    ...toAttendanceSummaryDto({
      daysAttended: uniqueDays.size,
      monthlyTarget: MONTHLY_TARGET,
      weekBars: weekBarsFromAttendance(visits),
      visits,
    }),
  };
};

export const getSlot = async (member) => ({
  preferredSlot: member.preferredSlot || {
    label: 'Morning slot',
    startTime: '6:00 AM',
    endTime: '7:00 AM',
    days: 'Mon–Fri',
    status: 'Active',
  },
});

export const updateSlot = async (member, body) => {
  if (!body?.startTime || !body?.endTime) {
    throw new BadRequestError('startTime and endTime are required');
  }
  const preferredSlot = {
    label: body.label || 'My slot',
    startTime: body.startTime,
    endTime: body.endTime,
    days: body.days || 'Mon–Fri',
    status: 'Active',
  };
  const updated = await updateById(Member, member.id, { preferredSlot });
  return { preferredSlot: updated.preferredSlot };
};

export const getGymTiming = async (member, gym) =>
  toGymTimingDto(gym.operatingHours, member.preferredSlot || (await getSlot(member)).preferredSlot);

const signCheckInQr = (member, gym) => {
  const expiresAt = new Date(Date.now() + QR_TTL_SEC * 1000);
  const payload = {
    purpose: 'member_check_in',
    memberId: member.id,
    memberCode: member.memberCode,
    gymId: gym.id || gym._id,
    nonce: crypto.randomBytes(8).toString('hex'),
  };
  const qrPayload = jwt.sign(payload, env.jwt.accessSecret, { expiresIn: QR_TTL_SEC });
  return { qrPayload, qrExpiresAt: expiresAt, expiresInSec: QR_TTL_SEC };
};

export const getCheckInPass = async (member, gym) => {
  const membership = await loadActiveMembership(member.id);
  const qr = signCheckInQr(member, gym);
  return toCheckInPassDto({
    member,
    gym,
    membership,
    ...qr,
  });
};

export const refreshCheckInPass = async (member, gym) => getCheckInPass(member, gym);

export const getNotificationSettings = async (userId) => {
  const user = asDoc(await User.findById(userId).select('notificationPreferences'));
  return toNotificationSettingsDto(user?.notificationPreferences || {});
};

export const updateNotificationSettings = async (userId, body) => {
  const current = await getNotificationSettings(userId);
  const next = {
    emailAlerts: body.emailAlerts ?? current.emailAlerts,
    smsReminders: body.smsReminders ?? current.smsReminders,
    pushNotifications: body.pushNotifications ?? current.pushNotifications,
    weeklyDigest: body.weeklyDigest ?? current.weeklyDigest,
  };
  await AuthService.updateNotificationPreferences(userId, next);
  return toNotificationSettingsDto(next);
};
