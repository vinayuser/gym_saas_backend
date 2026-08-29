import { ValidationError } from '../utils/errors.js';

const setReqProperty = (req, key, value) => {
  Object.defineProperty(req, key, {
    value,
    writable: true,
    configurable: true,
    enumerable: true,
  });
};

export const validate = (schema) => (req, _res, next) => {
  const result = schema.safeParse({
    body: req.body,
    query: req.query,
    params: req.params,
  });

  if (!result.success) {
    const errors = result.error.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    return next(new ValidationError('Validation failed', errors));
  }

  if (result.data.body) req.body = result.data.body;
  // Express 5: query/params are read-only getters — override per request
  if (result.data.query) {
    setReqProperty(req, 'query', { ...req.query, ...result.data.query });
  }
  if (result.data.params) {
    setReqProperty(req, 'params', { ...req.params, ...result.data.params });
  }

  next();
};
