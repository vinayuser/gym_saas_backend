import { Router } from 'express';
import * as UploadController from '../controllers/UploadController.js';
import { optionalAuth } from '../middlewares/auth.middleware.js';
import { uploadSingle, uploadMultiple } from '../middlewares/upload.middleware.js';
const router = Router();

const handleMulter = (multerMiddleware) => (req, res, next) => {
  multerMiddleware(req, res, (err) => {
    if (err) return next(err);
    next();
  });
};

router.post(
  '/upload',
  optionalAuth,
  handleMulter(uploadSingle('file')),
  UploadController.uploadSingle
);

router.post(
  '/upload-many',
  optionalAuth,
  handleMulter(uploadMultiple('files', 5)),
  UploadController.uploadMultiple
);

export default router;
