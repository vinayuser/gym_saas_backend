import * as MemberService from '../services/MemberService.js';
import { successResponse, paginatedResponse } from '../utils/response.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const list = asyncHandler(async (req, res) => {
  const result = await MemberService.list(req.tenantId, req.params.gymId, req.query);
  paginatedResponse(res, result.members, result.pagination);
});

export const getById = asyncHandler(async (req, res) => {
  const member = await MemberService.getById(
    req.tenantId,
    req.params.gymId,
    req.params.memberId
  );
  successResponse(res, member);
});

export const create = asyncHandler(async (req, res) => {
  const member = await MemberService.create(req.tenantId, req.params.gymId, req.body);
  successResponse(res, member, 'Member created successfully', 201);
});

export const update = asyncHandler(async (req, res) => {
  const member = await MemberService.update(
    req.tenantId,
    req.params.gymId,
    req.params.memberId,
    req.body
  );
  successResponse(res, member, 'Member updated successfully');
});

export const remove = asyncHandler(async (req, res) => {
  const result = await MemberService.remove(
    req.tenantId,
    req.params.gymId,
    req.params.memberId
  );
  successResponse(res, result);
});
