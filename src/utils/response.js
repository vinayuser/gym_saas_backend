import { pageParams } from '../helpers/query.js';
import { paginationMeta } from '../helpers/pagination.js';

export const successResponse = (res, data, message = 'Success', statusCode = 200, meta = null) => {
  const body = { success: true, message, data };
  if (meta) body.meta = meta;
  return res.status(statusCode).json(body);
};

export const paginatedResponse = (res, data, pagination, message = 'Success') => {
  return res.status(200).json({
    success: true,
    message,
    data,
    meta: { pagination },
  });
};

export const errorResponse = (res, message, statusCode = 500, code = 'INTERNAL_ERROR', errors = null) => {
  const body = { success: false, message, code };
  if (errors) body.errors = errors;
  return res.status(statusCode).json(body);
};

export const parsePagination = (query) => {
  const { page, limit, skip, search, sort } = pageParams(query);
  const sortBy = Object.keys(sort)[0] || 'createdAt';
  const sortOrder = sort[sortBy] === 1 ? 'asc' : 'desc';
  return { page, limit, skip, sortBy, sortOrder, search };
};

export const buildPaginationMeta = paginationMeta;
