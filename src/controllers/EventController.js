import * as EventService from '../services/EventService.js';
import { successResponse, paginatedResponse } from '../utils/response.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const list = asyncHandler(async (req, res) => {
  const result = await EventService.list(req.tenantId, req.params.gymId, req.query);
  paginatedResponse(res, result.events, result.pagination);
});

export const getById = asyncHandler(async (req, res) => {
  const event = await EventService.getById(req.tenantId, req.params.gymId, req.params.eventId);
  successResponse(res, event);
});

export const create = asyncHandler(async (req, res) => {
  const result = await EventService.create(req.tenantId, req.params.gymId, req.body);
  const count = result.occurrencesCreated || 1;
  const message =
    count > 1 ? `${count} calendar events created successfully` : 'Event created successfully';
  successResponse(res, result, message, 201);
});

export const update = asyncHandler(async (req, res) => {
  const event = await EventService.update(
    req.tenantId,
    req.params.gymId,
    req.params.eventId,
    req.body
  );
  successResponse(res, event, 'Event updated successfully');
});

export const remove = asyncHandler(async (req, res) => {
  const result = await EventService.remove(req.tenantId, req.params.gymId, req.params.eventId);
  successResponse(res, result);
});
