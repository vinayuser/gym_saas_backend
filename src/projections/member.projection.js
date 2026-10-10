import { withId, timestamps } from './common.projection.js';

export const memberList = withId({
  gymId: 1,
  userId: 1,
  memberCode: 1,
  firstName: 1,
  lastName: 1,
  email: 1,
  phone: 1,
  dateOfBirth: 1,
  gender: 1,
  profileImage: 1,
  qrCode: 1,
  isActive: 1,
  joinedAt: 1,
  memberships: 1,
  ...timestamps,
});

export const memberDetail = withId({
  gymId: 1,
  userId: 1,
  memberCode: 1,
  firstName: 1,
  lastName: 1,
  email: 1,
  phone: 1,
  dateOfBirth: 1,
  gender: 1,
  address: 1,
  profileImage: 1,
  emergencyContact: 1,
  emergencyPhone: 1,
  medicalNotes: 1,
  fitnessGoals: 1,
  qrCode: 1,
  isActive: 1,
  joinedAt: 1,
  memberships: 1,
  measurements: 1,
  workoutPlans: 1,
  dietPlans: 1,
  ...timestamps,
});

export const memberBrief = withId({
  firstName: 1,
  lastName: 1,
  memberCode: 1,
  phone: 1,
  email: 1,
  profileImage: 1,
});

export const planBrief = withId({
  name: 1,
  price: 1,
  billingCycle: 1,
});

export const membershipPlanPublic = withId({
  gymId: 1,
  name: 1,
  description: 1,
  billingCycle: 1,
  price: 1,
  durationDays: 1,
  features: 1,
  isActive: 1,
  _count: 1,
  ...timestamps,
});

export const membershipPublic = withId({
  gymId: 1,
  memberId: 1,
  planId: 1,
  status: 1,
  startDate: 1,
  endDate: 1,
  frozenAt: 1,
  frozenUntil: 1,
  amountPaid: 1,
  notes: 1,
  member: 1,
  plan: 1,
  ...timestamps,
});

export const paymentPublic = withId({
  gymId: 1,
  membershipId: 1,
  amount: 1,
  status: 1,
  method: 1,
  providerRef: 1,
  paidAt: 1,
  createdAt: 1,
  membership: 1,
});

export const invoicePublic = withId({
  gymId: 1,
  membershipId: 1,
  invoiceNumber: 1,
  amount: 1,
  taxAmount: 1,
  totalAmount: 1,
  status: 1,
  issuedAt: 1,
  dueAt: 1,
  paidAt: 1,
  pdfUrl: 1,
  createdAt: 1,
});
