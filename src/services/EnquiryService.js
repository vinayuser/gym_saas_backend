import * as EnquiryModel from '../models/EnquiryModel.js';
import * as GymModel from '../models/GymModel.js';
import { NotFoundError } from '../utils/errors.js';

const validateGym = async (tenantId, gymId) => {
  if (!gymId) return null;
  const gym = await GymModel.findById(gymId, tenantId);
  if (!gym) throw new NotFoundError('Gym not found');
  return gym;
};

const mapEnquiryInput = (body) => ({
  ...(body.name !== undefined && { name: body.name }),
  ...(body.lastName !== undefined && { lastName: body.lastName }),
  ...(body.email !== undefined && { email: body.email }),
  ...(body.phone !== undefined && { phone: body.phone }),
  ...(body.gender !== undefined && { gender: body.gender }),
  ...(body.dateOfBirth !== undefined && {
    dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : null,
  }),
  ...(body.address !== undefined && { address: body.address }),
  ...(body.city !== undefined && { city: body.city }),
  ...(body.state !== undefined && { state: body.state }),
  ...(body.pincode !== undefined && { pincode: body.pincode }),
  ...(body.occupation !== undefined && { occupation: body.occupation }),
  ...(body.source !== undefined && { source: body.source }),
  ...(body.referralSource !== undefined && { referralSource: body.referralSource }),
  ...(body.interestedIn !== undefined && { interestedIn: body.interestedIn }),
  ...(body.fitnessGoal !== undefined && { fitnessGoal: body.fitnessGoal }),
  ...(body.preferredContact !== undefined && { preferredContact: body.preferredContact }),
  ...(body.budget !== undefined && { budget: body.budget }),
  ...(body.trialDate !== undefined && {
    trialDate: body.trialDate ? new Date(body.trialDate) : null,
  }),
  ...(body.status !== undefined && { status: body.status }),
  ...(body.notes !== undefined && { notes: body.notes }),
  ...(body.followUpAt !== undefined && {
    followUpAt: body.followUpAt ? new Date(body.followUpAt) : null,
  }),
});

export const list = async (tenantId, gymId) => {
  await validateGym(tenantId, gymId);
  const enquiries = await EnquiryModel.findMany(tenantId, gymId, {});
  const grouped = await EnquiryModel.countByStatus(tenantId, gymId);
  const stats = {
    total: enquiries.length,
    byStatus: Object.fromEntries(grouped.map((g) => [g.status, g._count])),
  };
  return { enquiries, stats };
};

export const getById = async (tenantId, enquiryId) => {
  const enquiry = await EnquiryModel.findById(enquiryId, tenantId);
  if (!enquiry) throw new NotFoundError('Lead not found');
  return enquiry;
};

export const create = async (tenantId, gymId, body) => {
  await validateGym(tenantId, gymId);
  return EnquiryModel.create({
    tenantId,
    gymId: gymId || null,
    name: body.name,
    lastName: body.lastName || null,
    email: body.email || null,
    phone: body.phone || null,
    gender: body.gender || null,
    dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : null,
    address: body.address || null,
    city: body.city || null,
    state: body.state || null,
    pincode: body.pincode || null,
    occupation: body.occupation || null,
    source: body.source || 'walk-in',
    referralSource: body.referralSource || null,
    interestedIn: body.interestedIn || null,
    fitnessGoal: body.fitnessGoal || null,
    preferredContact: body.preferredContact || null,
    budget: body.budget ?? null,
    trialDate: body.trialDate ? new Date(body.trialDate) : null,
    status: body.status || 'NEW',
    notes: body.notes || null,
    followUpAt: body.followUpAt ? new Date(body.followUpAt) : null,
  });
};

export const update = async (tenantId, enquiryId, body) => {
  const existing = await EnquiryModel.findById(enquiryId, tenantId);
  if (!existing) throw new NotFoundError('Lead not found');
  const data = mapEnquiryInput(body);
  if (body.status === 'CONVERTED') data.convertedAt = new Date();
  return EnquiryModel.update(enquiryId, data);
};

export const remove = async (tenantId, enquiryId) => {
  const existing = await EnquiryModel.findById(enquiryId, tenantId);
  if (!existing) throw new NotFoundError('Lead not found');
  await EnquiryModel.remove(enquiryId);
  return { message: 'Lead deleted successfully' };
};
