import * as DashboardService from '../services/DashboardService.js';
import { successResponse } from '../utils/response.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const dashboard = asyncHandler(async (_req, res) => {
  const data = await DashboardService.getAdminDashboard();
  successResponse(res, data);
});
