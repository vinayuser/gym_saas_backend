import mongoose from 'mongoose';
import { defineSchema } from '../helpers/schema.js';
import { COLLECTIONS } from '../helpers/constants.js';

export const Attendance = mongoose.models.Attendance || mongoose.model(
  'Attendance',
  defineSchema(
    {
      gymId: { type: String, required: true, index: true },
      tenantId: String,
      memberId: { type: String, required: true, index: true },
      type: { type: String, required: true },
      source: { type: String, default: 'QR_CODE' },
      checkInAt: { type: Date, default: Date.now },
      checkOutAt: Date,
      latitude: Number,
      longitude: Number,
      deviceInfo: String,
      isLate: { type: Boolean, default: false },
      notes: String,
    },
    { collection: COLLECTIONS.ATTENDANCE, indexes: [{ keys: { gymId: 1, checkInAt: -1 } }] }
  )
);

export const Event = mongoose.models.Event || mongoose.model(
  'Event',
  defineSchema(
    {
      gymId: { type: String, required: true, index: true },
      tenantId: String,
      trainerId: String,
      title: { type: String, required: true },
      description: String,
      type: { type: String, default: 'OTHER' },
      imageUrl: String,
      recurrence: { type: String, default: 'NONE' },
      recurrenceEndAt: Date,
      recurrenceWeekdays: { type: [Number], default: [] },
      recurrenceWeekOfMonth: Number,
      recurrenceDayOfWeek: Number,
      seriesId: { type: String, index: true },
      startAt: { type: Date, required: true },
      endAt: { type: Date, required: true },
      location: String,
      seatLimit: Number,
      price: Number,
      isActive: { type: Boolean, default: true },
    },
    { collection: COLLECTIONS.EVENTS, indexes: [{ keys: { gymId: 1, startAt: 1 } }] }
  )
);

export const EventBooking = mongoose.models.EventBooking || mongoose.model(
  'EventBooking',
  defineSchema(
    {
      gymId: String,
      eventId: { type: String, required: true },
      memberId: { type: String, required: true },
      status: { type: String, default: 'confirmed' },
      bookedAt: { type: Date, default: Date.now },
    },
    {
      collection: COLLECTIONS.EVENT_BOOKINGS,
      indexes: [{ keys: { eventId: 1, memberId: 1 }, options: { unique: true } }],
    }
  )
);

export const Enquiry = mongoose.models.Enquiry || mongoose.model(
  'Enquiry',
  defineSchema(
    {
      tenantId: { type: String, required: true, index: true },
      gymId: { type: String, index: true },
      name: { type: String, required: true },
      lastName: String,
      email: String,
      phone: String,
      gender: String,
      dateOfBirth: Date,
      address: String,
      city: String,
      state: String,
      pincode: String,
      occupation: String,
      source: { type: String, default: 'walk-in' },
      referralSource: String,
      interestedIn: String,
      fitnessGoal: String,
      preferredContact: String,
      budget: Number,
      trialDate: Date,
      status: { type: String, default: 'NEW' },
      notes: String,
      followUpAt: Date,
      assignedToId: String,
      convertedAt: Date,
    },
    { collection: COLLECTIONS.ENQUIRIES, indexes: [{ keys: { tenantId: 1, status: 1 } }] }
  )
);

export const Banner = mongoose.models.Banner || mongoose.model(
  'Banner',
  defineSchema(
    {
      gymId: { type: String, required: true, index: true },
      tenantId: String,
      name: { type: String, required: true },
      internalCode: String,
      category: { type: String, default: 'PROMOTION' },
      placement: { type: String, default: 'GLOBAL_HOMEPAGE' },
      imageUrl: String,
      startDate: Date,
      endDate: Date,
      status: { type: String, default: 'DRAFT' },
      timeSlots: { type: [String], default: [] },
      targetAudience: { type: [String], default: [] },
      ctaType: String,
      ctaDestination: String,
      impressions: { type: Number, default: 0 },
      clicks: { type: Number, default: 0 },
      isActive: { type: Boolean, default: true },
      sortOrder: { type: Number, default: 0 },
    },
    { collection: COLLECTIONS.BANNERS }
  )
);

export const GymMediaAd = mongoose.models.GymMediaAd || mongoose.model(
  'GymMediaAd',
  defineSchema(
    {
      gymId: { type: String, required: true, index: true },
      tenantId: String,
      type: { type: String, required: true, enum: ['VIDEO', 'AUDIO'] },
      title: { type: String, required: true },
      mediaUrl: { type: String, required: true },
      thumbnailUrl: String,
      clickUrl: String,
      durationSec: Number,
      fileSize: Number,
      mimeType: String,
      isActive: { type: Boolean, default: true },
      sortOrder: { type: Number, default: 0 },
    },
    { collection: COLLECTIONS.GYM_MEDIA_ADS, indexes: [{ keys: { gymId: 1, type: 1, sortOrder: 1 } }] }
  )
);

export const DayPass = mongoose.models.DayPass || mongoose.model(
  'DayPass',
  defineSchema(
    {
      gymId: { type: String, required: true, index: true },
      tenantId: String,
      guestName: { type: String, required: true },
      phone: String,
      email: String,
      memberId: { type: String, index: true },
      userId: { type: String, index: true },
      amount: { type: Number, required: true },
      paid: { type: Boolean, default: true },
      status: {
        type: String,
        default: 'ACTIVE',
        enum: ['PENDING_PAYMENT', 'ACTIVE', 'USED', 'EXPIRED', 'FAILED', 'CANCELLED'],
      },
      paymentRef: String,
      razorpayOrderId: String,
      razorpayPaymentId: String,
      bookingCode: String,
      passCode: String,
      qrToken: String,
      qrExpiresAt: Date,
      validOn: { type: Date, required: true },
      checkedInAt: Date,
      notes: String,
    },
    {
      collection: COLLECTIONS.DAY_PASSES,
      indexes: [
        { keys: { gymId: 1, validOn: -1 } },
        { keys: { memberId: 1, validOn: -1 } },
        { keys: { razorpayOrderId: 1 } },
      ],
    }
  )
);

export const GymChatMessage = mongoose.models.GymChatMessage || mongoose.model(
  'GymChatMessage',
  defineSchema(
    {
      gymId: { type: String, required: true, index: true },
      tenantId: String,
      senderId: { type: String, required: true },
      content: String,
      mediaUrl: String,
      mediaType: String,
      isPinned: { type: Boolean, default: false },
      pinnedAt: Date,
      pinnedById: String,
      editedAt: Date,
    },
    { collection: COLLECTIONS.GYM_CHAT_MESSAGES, indexes: [{ keys: { gymId: 1, createdAt: 1 } }] }
  )
);

export const Coupon = mongoose.models.Coupon || mongoose.model(
  'Coupon',
  defineSchema(
    {
      gymId: { type: String, required: true, index: true },
      code: { type: String, required: true },
      discountPct: Number,
      discountAmt: Number,
      maxUses: Number,
      usedCount: { type: Number, default: 0 },
      validFrom: Date,
      validUntil: Date,
      isActive: { type: Boolean, default: true },
    },
    { collection: COLLECTIONS.COUPONS }
  )
);

export const Offer = mongoose.models.Offer || mongoose.model(
  'Offer',
  defineSchema(
    {
      gymId: { type: String, required: true, index: true },
      title: { type: String, required: true },
      description: String,
      discountPct: Number,
      validFrom: Date,
      validUntil: Date,
      isActive: { type: Boolean, default: true },
    },
    { collection: COLLECTIONS.OFFERS }
  )
);
