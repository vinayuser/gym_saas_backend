import { Schema } from 'mongoose';
import { randomUUID } from 'crypto';

const jsonTransform = (_doc, ret) => {
  ret.id = ret._id;
  delete ret._id;
  return ret;
};

/** Every collection shares id, timestamps, and soft-delete. */
export const defineSchema = (fields, { collection, indexes = [] } = {}) => {
  const schema = new Schema(
    {
      _id: { type: String, default: () => randomUUID() },
      ...fields,
      deletedAt: { type: Date, default: null },
    },
    {
      timestamps: true,
      versionKey: false,
      collection,
    }
  );

  indexes.forEach((item) => {
    if (item.keys) schema.index(item.keys, item.options || {});
    else schema.index(item);
  });

  schema.set('toJSON', { transform: jsonTransform });
  schema.set('toObject', { transform: jsonTransform });
  return schema;
};
