import * as CloudinaryService from '../services/CloudinaryService.js';
import * as InviteModel from '../models/InviteModel.js';
import { successResponse } from '../utils/response.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { BadRequestError, UnauthorizedError } from '../utils/errors.js';
import { assertFileSize, IMAGE_MAX_BYTES, VIDEO_MAX_BYTES } from '../middlewares/upload.middleware.js';

const assertUploadAccess = async (req) => {
  const inviteToken = req.query.inviteToken || req.body?.inviteToken;

  if (inviteToken) {
    const invite = await InviteModel.findByToken(inviteToken);
    if (!invite) throw new BadRequestError('Invalid invite token');
    if (invite.status === 'REVOKED' || invite.status === 'ACCEPTED') {
      throw new BadRequestError('Invite is no longer valid for uploads');
    }
    if (new Date(invite.expiresAt) < new Date()) {
      throw new BadRequestError('Invite has expired');
    }
    return { inviteToken };
  }

  if (!req.user) {
    throw new UnauthorizedError('Authentication or invite token required');
  }

  return {};
};

export const uploadSingle = asyncHandler(async (req, res) => {
  await assertUploadAccess(req);

  if (!req.file) {
    throw new BadRequestError('No file provided');
  }

  const folder = req.body.folder || req.query.folder;
  if (!folder) {
    throw new BadRequestError('folder is required (e.g. banners, gyms/logos, gyms/gallery, gyms/videos)');
  }

  const isVideo = req.file.mimetype.startsWith('video/');
  const isPdf = req.file.mimetype === 'application/pdf';
  assertFileSize(req.file, isVideo ? VIDEO_MAX_BYTES : IMAGE_MAX_BYTES);

  const resourceType =
    req.body.resourceType ||
    req.query.resourceType ||
    (isVideo ? 'video' : isPdf ? 'raw' : 'image');

  const asset = await CloudinaryService.uploadFromFile(req.file, {
    folder,
    resourceType,
  });

  successResponse(res, { asset }, 'File uploaded', 201);
});

export const uploadMultiple = asyncHandler(async (req, res) => {
  await assertUploadAccess(req);

  const files = req.files || [];
  if (!files.length) {
    throw new BadRequestError('No files provided');
  }

  const folder = req.body.folder || req.query.folder || 'gyms/gallery';
  const assets = [];

  for (const file of files) {
    assertFileSize(file, IMAGE_MAX_BYTES);
    const asset = await CloudinaryService.uploadFromFile(file, {
      folder,
      resourceType: 'image',
    });
    assets.push(asset);
  }

  successResponse(res, { assets }, 'Files uploaded', 201);
});
