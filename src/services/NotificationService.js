import { SupportTicket, GymInvite, Enquiry, Member, Gym } from '../schemas/index.js';
import { asDoc } from '../helpers/document.js';
import { notDeleted } from '../helpers/query.js';
import { SORT } from '../helpers/constants.js';

const item = (id, title, message, createdAt, href) => ({
  id,
  title,
  message,
  createdAt,
  href,
});

const listAdmin = async () => {
  const [ticketDocs, inviteDocs] = await Promise.all([
    SupportTicket.find().sort(SORT.CREATED_DESC).limit(6).select('subject senderName status createdAt'),
    GymInvite.find().sort(SORT.CREATED_DESC).limit(6).select('email businessName status createdAt'),
  ]);
  const tickets = ticketDocs.map(asDoc);
  const invites = inviteDocs.map(asDoc);

  return [
    ...tickets.map((ticket) =>
      item(
        `ticket-${ticket.id}`,
        ticket.subject,
        `${ticket.senderName || 'Support ticket'} · ${ticket.status.replace(/_/g, ' ')}`,
        ticket.createdAt,
        '/admin/support'
      )
    ),
    ...invites.map((invite) =>
      item(
        `invite-${invite.id}`,
        invite.businessName || invite.email,
        `Invite ${String(invite.status).toLowerCase().replace(/_/g, ' ')} · ${invite.email}`,
        invite.createdAt,
        '/admin/invites'
      )
    ),
  ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

const listGym = async (tenantId) => {
  if (!tenantId) return [];

  const gyms = await Gym.find({ tenantId, ...notDeleted }).select('_id');
  const gymIds = gyms.map((g) => g._id);

  const [enquiryDocs, memberDocs] = await Promise.all([
    Enquiry.find({ tenantId }).sort(SORT.CREATED_DESC).limit(6).select('name lastName status createdAt'),
    Member.find({ gymId: { $in: gymIds }, ...notDeleted })
      .sort(SORT.CREATED_DESC)
      .limit(6)
      .select('firstName lastName createdAt'),
  ]);
  const enquiries = enquiryDocs.map(asDoc);
  const members = memberDocs.map(asDoc);

  return [
    ...enquiries.map((lead) =>
      item(
        `lead-${lead.id}`,
        [lead.name, lead.lastName].filter(Boolean).join(' '),
        `Enquiry · ${String(lead.status).replace(/_/g, ' ')}`,
        lead.createdAt,
        '/owner/leads'
      )
    ),
    ...members.map((member) =>
      item(
        `member-${member.id}`,
        `${member.firstName} ${member.lastName}`.trim(),
        'Member joined',
        member.createdAt,
        '/owner/members'
      )
    ),
  ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

export const listNotifications = async (user) => {
  const items = user.role === 'SUPER_ADMIN' ? await listAdmin() : await listGym(user.tenantId);
  return { items };
};
