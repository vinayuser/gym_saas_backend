import * as GymService from '../services/GymService.js';
import * as DashboardService from '../services/DashboardService.js';
import { successResponse, paginatedResponse } from '../utils/response.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const list = asyncHandler(async (req, res) => {
  const result = await GymService.list(req.tenantId, req.query);
  paginatedResponse(res, result.gyms, result.pagination);
});

export const dashboard = asyncHandler(async (req, res) => {
  const data = await DashboardService.getOwnerDashboard(req.tenantId, req.params.gymId);
  successResponse(res, data);
});

export const dashboardAnalytics = asyncHandler(async (req, res) => {
  const data = await DashboardService.getOwnerAnalytics(req.tenantId, req.params.gymId);
  successResponse(res, data);
});

export const dashboardReports = asyncHandler(async (req, res) => {
  const data = await DashboardService.getOwnerReports(req.tenantId, req.params.gymId);
  successResponse(res, data);
});

export const getById = asyncHandler(async (req, res) => {
  const gym = await GymService.getById(req.tenantId, req.params.gymId);
  successResponse(res, gym);
});

export const create = asyncHandler(async (req, res) => {
  const gym = await GymService.create(req.tenantId, req.body);
  successResponse(res, gym, 'Gym created successfully', 201);
});

export const update = asyncHandler(async (req, res) => {
  const gym = await GymService.update(req.tenantId, req.params.gymId, req.body);
  successResponse(res, gym, 'Gym updated successfully');
});

export const remove = asyncHandler(async (req, res) => {
  const result = await GymService.remove(req.tenantId, req.params.gymId);
  successResponse(res, result);
});
