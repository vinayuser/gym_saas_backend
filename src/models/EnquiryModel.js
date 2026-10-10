import { Enquiry } from '../schemas/index.js';
import { aggregateOne, groupCount } from '../helpers/pagination.js';
import { createDoc, updateById, asDoc } from '../helpers/document.js';
import { lookupOne } from '../helpers/query.js';
import { COLLECTIONS, SORT } from '../helpers/constants.js';
import { enquiryPublic } from '../projections/ops.projection.js';
import { userBrief } from '../projections/user.projection.js';

const scope = (tenantId, gymId) => ({
  deletedAt: null,
  ...(tenantId ? { tenantId } : {}),
  ...(gymId ? { gymId } : {}),
});

export const findMany = (tenantId, gymId) =>
  Enquiry.aggregate([
    { $match: scope(tenantId, gymId) },
    { $sort: SORT.CREATED_DESC },
    ...lookupOne(COLLECTIONS.USERS, 'assignedToId', 'assignedTo', userBrief),
    { $project: enquiryPublic },
  ]);

export const findById = (id, tenantId) =>
  aggregateOne(Enquiry, {
    match: { _id: id, ...(tenantId ? { tenantId } : {}) },
    lookups: lookupOne(COLLECTIONS.USERS, 'assignedToId', 'assignedTo', userBrief),
    project: enquiryPublic,
  });

export const create = (data) => createDoc(Enquiry, data);
export const update = (id, data) => updateById(Enquiry, id, data);
export const remove = async (id) => asDoc(await Enquiry.findByIdAndDelete(id));

export const statsByStatus = (gymId) => groupCount(Enquiry, { match: { gymId, deletedAt: null }, by: 'status' });

export const countByStatus = async (tenantId, gymId) => {
  const rows = await groupCount(Enquiry, { match: scope(tenantId, gymId), by: 'status' });
  return rows.map((row) => ({ status: row._id, _count: row.count }));
};
