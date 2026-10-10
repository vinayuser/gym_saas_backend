/** Maps Mongo `_id` to the `id` the API already returns. */
export const idFields = {
  _id: 0,
  id: '$_id',
};

export const timestamps = {
  createdAt: 1,
  updatedAt: 1,
};

export const withId = (fields) => ({ ...idFields, ...fields });
