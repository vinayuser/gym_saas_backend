import { PlatformBroadcast } from '../schemas/index.js';
import { createDoc, updateMany } from '../helpers/document.js';
import { notDeleted } from '../helpers/query.js';
import { SORT } from '../helpers/constants.js';
import { broadcastPublic } from '../projections/platform.projection.js';
import { BadRequestError, NotFoundError } from '../utils/errors.js';

const findActive = async () => {
  const [row] = await PlatformBroadcast.aggregate([
    { $match: { isActive: true, ...notDeleted } },
    { $sort: SORT.CREATED_DESC },
    { $limit: 1 },
    { $project: broadcastPublic },
  ]);
  return row || null;
};

export const getActive = async () => ({
  broadcast: await findActive(),
});

export const create = async (userId, message) => {
  const text = String(message || '').trim();
  if (!text) throw new BadRequestError('Message is required');

  await updateMany(PlatformBroadcast, { isActive: true, ...notDeleted }, { isActive: false });

  const broadcast = await createDoc(PlatformBroadcast, {
    message: text,
    isActive: true,
    createdById: userId,
  });

  return { broadcast };
};

export const removeActive = async () => {
  const current = await findActive();
  if (!current) throw new NotFoundError('No live broadcast');

  await updateMany(PlatformBroadcast, { isActive: true, ...notDeleted }, { isActive: false });
  return { broadcast: null };
};
