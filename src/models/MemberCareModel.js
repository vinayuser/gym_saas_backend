import { WorkoutPlan, DietPlan, BodyMeasurement } from '../schemas/index.js';
import { createDoc, updateById, asDoc } from '../helpers/document.js';
import { SORT } from '../helpers/constants.js';

const withId = (doc) => (doc ? { ...doc, id: doc._id || doc.id } : null);

export const listWorkouts = (memberId) =>
  WorkoutPlan.aggregate([
    { $match: { memberId, deletedAt: null } },
    { $sort: SORT.CREATED_DESC },
    { $addFields: { id: '$_id' } },
    { $project: { _id: 0 } },
  ]);

export const createWorkout = (data) => createDoc(WorkoutPlan, data);
export const updateWorkout = (id, data) => updateById(WorkoutPlan, id, data);
export const deleteWorkout = (id) => WorkoutPlan.findByIdAndDelete(id);
export const findWorkout = async (id, memberId) =>
  withId(await WorkoutPlan.findOne({ _id: id, memberId }).lean());

export const listDiets = (memberId) =>
  DietPlan.aggregate([
    { $match: { memberId, deletedAt: null } },
    { $sort: SORT.CREATED_DESC },
    { $addFields: { id: '$_id' } },
    { $project: { _id: 0 } },
  ]);

export const createDiet = (data) => createDoc(DietPlan, data);
export const updateDiet = (id, data) => updateById(DietPlan, id, data);
export const deleteDiet = (id) => DietPlan.findByIdAndDelete(id);
export const findDiet = async (id, memberId) => withId(await DietPlan.findOne({ _id: id, memberId }).lean());

export const listMeasurements = (memberId) =>
  BodyMeasurement.aggregate([
    { $match: { memberId, deletedAt: null } },
    { $sort: { measuredAt: -1 } },
    { $addFields: { id: '$_id' } },
    { $project: { _id: 0 } },
  ]);

export const createMeasurement = (data) => createDoc(BodyMeasurement, data);
export const deleteMeasurement = (id) => BodyMeasurement.findByIdAndDelete(id);
export const findMeasurement = async (id, memberId) =>
  withId(await BodyMeasurement.findOne({ _id: id, memberId }).lean());
