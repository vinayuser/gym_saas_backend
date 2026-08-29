import * as EnquiryService from '../services/EnquiryService.js';
import { successResponse } from '../utils/response.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const list = asyncHandler(async (req, res) => {
  const result = await EnquiryService.list(req.tenantId, req.params.gymId);
  successResponse(res, result);
});

export const getById = asyncHandler(async (req, res) => {
  const enquiry = await EnquiryService.getById(req.tenantId, req.params.enquiryId);
  successResponse(res, enquiry);
});

export const create = asyncHandler(async (req, res) => {
  const enquiry = await EnquiryService.create(req.tenantId, req.params.gymId, req.body);
  successResponse(res, enquiry, 'Lead created successfully', 201);
});

export const update = asyncHandler(async (req, res) => {
  const enquiry = await EnquiryService.update(req.tenantId, req.params.enquiryId, req.body);
  successResponse(res, enquiry, 'Lead updated successfully');
});

export const remove = asyncHandler(async (req, res) => {
  const result = await EnquiryService.remove(req.tenantId, req.params.enquiryId);
  successResponse(res, result);
});
