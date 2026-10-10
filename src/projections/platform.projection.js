import { withId, timestamps } from './common.projection.js';

export const broadcastPublic = withId({
  message: 1,
  isActive: 1,
  createdById: 1,
  ...timestamps,
});
