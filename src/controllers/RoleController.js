import * as RoleService from '../services/RoleService.js';
import * as PlatformAdminService from '../services/PlatformAdminService.js';
import { successResponse } from '../utils/response.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const list = asyncHandler(async (_req, res) => {
  const data = await RoleService.listRoles();
  successResponse(res, data);
});

export const listTeam = asyncHandler(async (req, res) => {
  const data = await PlatformAdminService.listTeam(req.query);
  successResponse(res, data, 'Success', 200, data.pagination ? { pagination: data.pagination } : null);
});

export const createRole = asyncHandler(async (req, res) => {
  const role = await PlatformAdminService.createRole(req.body);
  successResponse(res, { role }, 'Role created', 201);
});

export const updateRole = asyncHandler(async (req, res) => {
  const role = await PlatformAdminService.updateRole(req.params.roleId, req.body);
  successResponse(res, { role }, 'Role updated');
});

export const deleteRole = asyncHandler(async (req, res) => {
  await PlatformAdminService.deleteRole(req.params.roleId);
  successResponse(res, null, 'Role deleted');
});

export const createAdmin = asyncHandler(async (req, res) => {
  const admin = await PlatformAdminService.createAdmin(req.body);
  successResponse(res, { admin }, 'Sub-admin created', 201);
});

export const updateAdmin = asyncHandler(async (req, res) => {
  const admin = await PlatformAdminService.updateAdmin(req.params.userId, req.body);
  successResponse(res, { admin }, 'Sub-admin updated');
});

export const setPermission = asyncHandler(async (req, res) => {
  const enabled = Boolean(req.body?.enabled);
  const role = await RoleService.setRolePermission(req.params.roleId, req.params.permissionId, enabled);
  successResponse(res, { role }, 'Permission updated');
});
