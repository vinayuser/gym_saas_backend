import { Readable } from 'stream';
import cloudinary, { isCloudinaryConfigured } from '../config/cloudinary.js';
import env from '../config/env.js';
import { BadRequestError, AppError } from '../utils/errors.js';

const ALLOWED_FOLDERS = new Set([
  'banners',
  'gyms/logos',
  'gyms/gallery',
  'gyms/videos',
  'invites',
  'products',
  'avatars',
  'staff/avatars',
  'staff/address-proofs',
  'staff/id-proofs',
  'members/avatars',
  'events/images',
  'gym-chat',
]);

const resolveFolder = (folder) => {
  const sub = (folder || 'misc').replace(/^\/+|\/+$/g, '');
  if (!ALLOWED_FOLDERS.has(sub)) {
    throw new BadRequestError(`Invalid upload folder: ${folder}`);
  }
  return `${env.cloudinary.folder}/${sub}`;
};

const uploadStream = (buffer, options) =>
  new Promise((resolve, reject) => {
    const upload = cloudinary.uploader.upload_stream(options, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
    Readable.from(buffer).pipe(upload);
  });

export const uploadBuffer = async (buffer, { folder, resourceType = 'auto', filename }) => {
  if (!isCloudinaryConfigured()) {
    throw new AppError(
      'Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.',
      503,
      'SERVICE_UNAVAILABLE'
    );
  }

  if (!buffer?.length) {
    throw new BadRequestError('Empty file');
  }

  const fullFolder = resolveFolder(folder);

  const result = await uploadStream(buffer, {
    folder: fullFolder,
    resource_type: resourceType,
    public_id: filename ? filename.replace(/\.[^.]+$/, '') : undefined,
    overwrite: false,
  });

  return {
    url: result.secure_url,
    publicId: result.public_id,
    resourceType: result.resource_type,
    format: result.format,
    bytes: result.bytes,
    width: result.width,
    height: result.height,
    duration: result.duration,
  };
};

export const uploadFromFile = async (file, options) => {
  const mimetype = file.mimetype || '';
  let resourceType = options.resourceType || 'auto';

  if (resourceType === 'auto') {
    if (mimetype.startsWith('video/')) resourceType = 'video';
    else if (mimetype.startsWith('image/')) resourceType = 'image';
    else throw new BadRequestError('Unsupported file type');
  }

  return uploadBuffer(file.buffer, {
    ...options,
    resourceType,
    filename: file.originalname,
  });
};

export const deleteByPublicId = async (publicId, resourceType = 'image') => {
  if (!isCloudinaryConfigured() || !publicId) return;
  await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
};
