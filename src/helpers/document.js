export const asDoc = (doc) => {
  if (!doc) return null;
  return typeof doc.toJSON === 'function' ? doc.toJSON() : doc;
};

export const createDoc = async (Model, data) => asDoc(await Model.create(data));

export const updateById = async (Model, id, data) =>
  asDoc(await Model.findByIdAndUpdate(id, { $set: data }, { returnDocument: 'after' }));

export const updateMany = (Model, match, data) => Model.updateMany(match, { $set: data });

export const softDeleteById = (Model, id, extra = {}) =>
  updateById(Model, id, { deletedAt: new Date(), ...extra });

export const findByIdLean = async (Model, id, extraMatch = {}) =>
  asDoc(await Model.findOne({ _id: id, ...extraMatch }));
