import { SupportTicket, SupportTicketMessage } from '../schemas/index.js';
import { paginate, aggregateOne } from '../helpers/pagination.js';
import { createDoc, updateById } from '../helpers/document.js';
import { lookupOne } from '../helpers/query.js';
import { COLLECTIONS, PAGE, SORT } from '../helpers/constants.js';
import { supportPublic, supportMessagePublic } from '../projections/invite.projection.js';
import { tenantBrief } from '../projections/tenant.projection.js';
import { userBrief } from '../projections/user.projection.js';

const ticketLookups = [
  ...lookupOne(COLLECTIONS.TENANTS, 'tenantId', 'tenant', tenantBrief),
  ...lookupOne(COLLECTIONS.USERS, 'userId', 'user', userBrief),
];

export const create = async (data) => {
  const doc = await createDoc(SupportTicket, data);
  return findById(doc.id);
};

export const findById = (id) =>
  aggregateOne(SupportTicket, { match: { _id: id }, lookups: ticketLookups, project: supportPublic });

export const update = async (id, data) => {
  await updateById(SupportTicket, id, data);
  return findById(id);
};

export const list = async ({ where = {}, skip = 0, take = PAGE.DEFAULT }) => {
  const { data, pagination } = await paginate(SupportTicket, {
    match: where,
    lookups: ticketLookups,
    project: supportPublic,
    sort: SORT.CREATED_DESC,
    page: Math.floor(skip / take) + 1,
    limit: take,
  });
  return data;
};

export const count = (where) => SupportTicket.countDocuments(where);

export const createMessage = (data) => createDoc(SupportTicketMessage, data);

export const listMessages = async (ticketId) => {
  const { data } = await paginate(SupportTicketMessage, {
    match: { ticketId },
    project: supportMessagePublic,
    sort: SORT.CREATED_ASC,
    page: 1,
    limit: PAGE.MAX,
  });
  return data;
};
