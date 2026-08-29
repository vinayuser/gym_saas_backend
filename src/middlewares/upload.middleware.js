import multer from 'multer';
import { BadRequestError } from '../utils/errors.js';

const storage = multer.memoryStorage();

const imageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const videoTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
const documentTypes = ['application/pdf'];

export const uploadSingle = (fieldName = 'file') =>
  multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const ok =
        imageTypes.includes(file.mimetype) ||
        videoTypes.includes(file.mimetype) ||
        documentTypes.includes(file.mimetype);
      if (!ok) {
        return cb(
          new BadRequestError(
            'Only images (JPEG, PNG, WebP, GIF), PDF documents, and videos (MP4, WebM) are allowed'
          )
        );
      }
      cb(null, true);
    },
  }).single(fieldName);

export const uploadMultiple = (fieldName = 'files', maxCount = 5) =>
  multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024, files: maxCount },
    fileFilter: (_req, file, cb) => {
      if (!imageTypes.includes(file.mimetype)) {
        return cb(new BadRequestError('Only images (JPEG, PNG, WebP, GIF) are allowed'));
      }
      cb(null, true);
    },
  }).array(fieldName, maxCount);

export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const VIDEO_MAX_BYTES = 50 * 1024 * 1024;

export const assertFileSize = (file, maxBytes) => {
  if (file.size > maxBytes) {
    throw new BadRequestError(`File must be under ${Math.round(maxBytes / 1024 / 1024)}MB`);
  }
};
