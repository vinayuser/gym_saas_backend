import multer from 'multer';
import { BadRequestError } from '../utils/errors.js';

const storage = multer.memoryStorage();

const imageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const videoTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
const audioTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/mp4', 'audio/m4a', 'audio/x-m4a', 'audio/aac', 'audio/ogg'];
const documentTypes = ['application/pdf'];

export const uploadSingle = (fieldName = 'file') =>
  multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const ok =
        imageTypes.includes(file.mimetype) ||
        videoTypes.includes(file.mimetype) ||
        audioTypes.includes(file.mimetype) ||
        documentTypes.includes(file.mimetype);
      if (!ok) {
        return cb(
          new BadRequestError(
            'Only images (JPEG, PNG, WebP, GIF), PDF documents, videos (MP4, WebM), and audio (MP3, WAV, M4A) are allowed'
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
export const AUDIO_MAX_BYTES = 10 * 1024 * 1024;

export const assertFileSize = (file, maxBytes) => {
  if (file.size > maxBytes) {
    throw new BadRequestError(`File must be under ${Math.round(maxBytes / 1024 / 1024)}MB`);
  }
};
