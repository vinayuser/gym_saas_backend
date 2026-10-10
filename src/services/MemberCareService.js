import * as MemberCareModel from '../models/MemberCareModel.js';
import * as MemberModel from '../models/MemberModel.js';
import * as GymModel from '../models/GymModel.js';
import { Trainer } from '../schemas/index.js';
import { asDoc } from '../helpers/document.js';
import { NotFoundError } from '../utils/errors.js';

const validateMember = async (tenantId, gymId, memberId) => {
  const gym = await GymModel.findById(gymId, tenantId);
  if (!gym) throw new NotFoundError('Gym not found');
  const member = await MemberModel.findById(memberId, gymId);
  if (!member) throw new NotFoundError('Member not found');
  return member;
};

const resolveTrainerId = async (gymId, user) => {
  if (!user?.id) return null;
  const trainer = asDoc(await Trainer.findOne({ gymId, userId: user.id }).select('_id'));
  return trainer?.id || null;
};

export const listPlans = async (tenantId, gymId, memberId) => {
  await validateMember(tenantId, gymId, memberId);
  const [workouts, diets, measurements] = await Promise.all([
    MemberCareModel.listWorkouts(memberId),
    MemberCareModel.listDiets(memberId),
    MemberCareModel.listMeasurements(memberId),
  ]);
  return { workouts, diets, measurements };
};

export const createWorkout = async (tenantId, gymId, memberId, body, user) => {
  await validateMember(tenantId, gymId, memberId);
  const trainerId = body.trainerId || (await resolveTrainerId(gymId, user));
  return MemberCareModel.createWorkout({
    memberId,
    trainerId,
    title: body.title,
    description: body.description || null,
    exercises: body.exercises || null,
    startDate: body.startDate ? new Date(body.startDate) : new Date(),
    endDate: body.endDate ? new Date(body.endDate) : null,
    isActive: body.isActive !== false,
  });
};

export const updateWorkout = async (tenantId, gymId, memberId, planId, body) => {
  await validateMember(tenantId, gymId, memberId);
  const existing = await MemberCareModel.findWorkout(planId, memberId);
  if (!existing) throw new NotFoundError('Workout plan not found');
  return MemberCareModel.updateWorkout(planId, {
    ...(body.title !== undefined && { title: body.title }),
    ...(body.description !== undefined && { description: body.description }),
    ...(body.exercises !== undefined && { exercises: body.exercises }),
    ...(body.startDate !== undefined && { startDate: new Date(body.startDate) }),
    ...(body.endDate !== undefined && { endDate: body.endDate ? new Date(body.endDate) : null }),
    ...(body.isActive !== undefined && { isActive: body.isActive }),
  });
};

export const removeWorkout = async (tenantId, gymId, memberId, planId) => {
  await validateMember(tenantId, gymId, memberId);
  const existing = await MemberCareModel.findWorkout(planId, memberId);
  if (!existing) throw new NotFoundError('Workout plan not found');
  await MemberCareModel.deleteWorkout(planId);
  return { message: 'Workout plan deleted' };
};

export const createDiet = async (tenantId, gymId, memberId, body) => {
  await validateMember(tenantId, gymId, memberId);
  return MemberCareModel.createDiet({
    memberId,
    title: body.title,
    description: body.description || null,
    meals: body.meals || null,
    startDate: body.startDate ? new Date(body.startDate) : new Date(),
    endDate: body.endDate ? new Date(body.endDate) : null,
    isActive: body.isActive !== false,
  });
};

export const updateDiet = async (tenantId, gymId, memberId, planId, body) => {
  await validateMember(tenantId, gymId, memberId);
  const existing = await MemberCareModel.findDiet(planId, memberId);
  if (!existing) throw new NotFoundError('Diet plan not found');
  return MemberCareModel.updateDiet(planId, {
    ...(body.title !== undefined && { title: body.title }),
    ...(body.description !== undefined && { description: body.description }),
    ...(body.meals !== undefined && { meals: body.meals }),
    ...(body.startDate !== undefined && { startDate: new Date(body.startDate) }),
    ...(body.endDate !== undefined && { endDate: body.endDate ? new Date(body.endDate) : null }),
    ...(body.isActive !== undefined && { isActive: body.isActive }),
  });
};

export const removeDiet = async (tenantId, gymId, memberId, planId) => {
  await validateMember(tenantId, gymId, memberId);
  const existing = await MemberCareModel.findDiet(planId, memberId);
  if (!existing) throw new NotFoundError('Diet plan not found');
  await MemberCareModel.deleteDiet(planId);
  return { message: 'Diet plan deleted' };
};

export const createMeasurement = async (tenantId, gymId, memberId, body) => {
  await validateMember(tenantId, gymId, memberId);
  return MemberCareModel.createMeasurement({
    memberId,
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

export const removeMeasurement = async (tenantId, gymId, memberId, measurementId) => {
  await validateMember(tenantId, gymId, memberId);
  const existing = await MemberCareModel.findMeasurement(measurementId, memberId);
  if (!existing) throw new NotFoundError('Measurement not found');
  await MemberCareModel.deleteMeasurement(measurementId);
  return { message: 'Measurement deleted' };
};
