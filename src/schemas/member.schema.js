import mongoose from 'mongoose';
import { defineSchema } from '../helpers/schema.js';
import { COLLECTIONS, MEMBERSHIP_STATUS, PAYMENT_STATUS, INVOICE_STATUS } from '../helpers/constants.js';

export const Member = mongoose.models.Member || mongoose.model(
  'Member',
  defineSchema(
    {
      gymId: { type: String, required: true, index: true },
      tenantId: String,
      userId: { type: String, unique: true, sparse: true },
      memberCode: { type: String, required: true },
      firstName: { type: String, required: true },
      lastName: { type: String, required: true },
      email: String,
      phone: String,
      dateOfBirth: Date,
      gender: String,
      address: String,
      profileImage: String,
      emergencyContact: String,
      emergencyPhone: String,
      medicalNotes: String,
      fitnessGoals: String,
      qrCode: String,
      preferredSlot: { type: mongoose.Schema.Types.Mixed },
      lockerNumber: String,
      lockerZone: String,
      isActive: { type: Boolean, default: true },
      joinedAt: { type: Date, default: Date.now },
    },
    { collection: COLLECTIONS.MEMBERS, indexes: [{ keys: { gymId: 1, memberCode: 1 }, options: { unique: true } }] }
  )
);

export const BodyMeasurement = mongoose.models.BodyMeasurement || mongoose.model(
  'BodyMeasurement',
  defineSchema(
    {
      gymId: String,
      memberId: { type: String, required: true, index: true },
      weight: Number,
      height: Number,
      chest: Number,
      waist: Number,
      hips: Number,
      biceps: Number,
      thighs: Number,
      bodyFat: Number,
      notes: String,
      measuredAt: { type: Date, default: Date.now },
    },
    { collection: COLLECTIONS.BODY_MEASUREMENTS }
  )
);

export const GymMembershipPlan = mongoose.models.GymMembershipPlan || mongoose.model(
  'GymMembershipPlan',
  defineSchema(
    {
      gymId: { type: String, required: true, index: true },
      tenantId: String,
      name: { type: String, required: true },
      description: String,
      billingCycle: { type: String, required: true },
      price: { type: Number, required: true },
      durationDays: { type: Number, required: true },
      features: { type: mongoose.Schema.Types.Mixed },
      isActive: { type: Boolean, default: true },
    },
    { collection: COLLECTIONS.GYM_MEMBERSHIP_PLANS }
  )
);

export const Membership = mongoose.models.Membership || mongoose.model(
  'Membership',
  defineSchema(
    {
      gymId: { type: String, required: true, index: true },
      tenantId: String,
      memberId: { type: String, required: true, index: true },
      planId: { type: String, required: true },
      status: { type: String, default: MEMBERSHIP_STATUS.PENDING },
      startDate: { type: Date, required: true },
      endDate: { type: Date, required: true },
      frozenAt: Date,
      frozenUntil: Date,
      amountPaid: Number,
      notes: String,
    },
    { collection: COLLECTIONS.MEMBERSHIPS, indexes: [{ keys: { gymId: 1, status: 1 } }] }
  )
);

export const MemberPayment = mongoose.models.MemberPayment || mongoose.model(
  'MemberPayment',
  defineSchema(
    {
      gymId: { type: String, index: true },
      tenantId: String,
      membershipId: { type: String, required: true, index: true },
      amount: { type: Number, required: true },
      status: { type: String, default: PAYMENT_STATUS.PENDING },
      method: String,
      providerRef: String,
      paidAt: Date,
    },
    { collection: COLLECTIONS.MEMBER_PAYMENTS }
  )
);

export const Invoice = mongoose.models.Invoice || mongoose.model(
  'Invoice',
  defineSchema(
    {
      gymId: { type: String, required: true, index: true },
      tenantId: String,
      membershipId: String,
      invoiceNumber: { type: String, unique: true },
      amount: { type: Number, required: true },
      taxAmount: Number,
      totalAmount: { type: Number, required: true },
      status: { type: String, default: INVOICE_STATUS.DRAFT },
      issuedAt: Date,
      dueAt: Date,
      paidAt: Date,
      pdfUrl: String,
    },
    { collection: COLLECTIONS.INVOICES }
  )
);

export const WorkoutPlan = mongoose.models.WorkoutPlan || mongoose.model(
  'WorkoutPlan',
  defineSchema(
    {
      gymId: String,
      memberId: { type: String, required: true, index: true },
      trainerId: String,
      title: { type: String, required: true },
      description: String,
      exercises: { type: mongoose.Schema.Types.Mixed },
      startDate: { type: Date, required: true },
      endDate: Date,
      isActive: { type: Boolean, default: true },
    },
    { collection: COLLECTIONS.WORKOUT_PLANS }
  )
);

export const DietPlan = mongoose.models.DietPlan || mongoose.model(
  'DietPlan',
  defineSchema(
    {
      gymId: String,
      memberId: { type: String, required: true, index: true },
      title: { type: String, required: true },
      description: String,
      meals: { type: mongoose.Schema.Types.Mixed },
      startDate: { type: Date, required: true },
      endDate: Date,
      isActive: { type: Boolean, default: true },
    },
    { collection: COLLECTIONS.DIET_PLANS }
  )
);
