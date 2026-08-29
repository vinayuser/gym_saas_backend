import { AppError } from '../utils/errors.js';
import logger from '../utils/logger.js';
import { errorResponse } from '../utils/response.js';
import env from '../config/env.js';

export const errorHandler = (err, req, res, _next) => {
  if (err instanceof AppError) {
    return errorResponse(res, err.message, err.statusCode, err.code, err.errors);
  }

  if (err.name === 'JsonWebTokenError') {
    return errorResponse(res, 'Invalid token', 401, 'INVALID_TOKEN');
  }

  if (err.name === 'TokenExpiredError') {
    return errorResponse(res, 'Token expired', 401, 'TOKEN_EXPIRED');
  }

  if (err.code === 'P2002') {
    return errorResponse(res, 'Duplicate record', 409, 'DUPLICATE');
  }

  logger.error('Unhandled error:', { message: err.message, stack: err.stack });

  const message = env.nodeEnv === 'production' ? 'Internal server error' : err.message;
  return errorResponse(res, message, 500, 'INTERNAL_ERROR');
};

export const notFoundHandler = (req, res) => {
  errorResponse(res, `Route ${req.method} ${req.originalUrl} not found`, 404, 'NOT_FOUND');
};
