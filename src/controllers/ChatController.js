import * as ChatService from '../services/ChatService.js';
import { successResponse } from '../utils/response.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const list = asyncHandler(async (req, res) => {
  const data = await ChatService.list(req.tenantId, req.params.gymId, req.query, req.user.id);
  successResponse(res, data);
});

export const create = asyncHandler(async (req, res) => {
  const message = await ChatService.create(req.tenantId, req.params.gymId, req.body, req.user);
  successResponse(res, message, 'Message sent', 201);
});

export const update = asyncHandler(async (req, res) => {
  const message = await ChatService.update(
    req.tenantId,
    req.params.gymId,
    req.params.messageId,
    req.body,
    req.user
  );
  successResponse(res, message);
});

export const remove = asyncHandler(async (req, res) => {
  const result = await ChatService.remove(
    req.tenantId,
    req.params.gymId,
    req.params.messageId,
    req.user
  );
  successResponse(res, result);
});

export const pin = asyncHandler(async (req, res) => {
  const message = await ChatService.pin(
    req.tenantId,
    req.params.gymId,
    req.params.messageId,
    req.body,
    req.user
  );
  successResponse(res, message);
});
