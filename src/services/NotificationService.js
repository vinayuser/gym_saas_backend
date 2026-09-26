import prisma from '../config/database.js';

const item = (id, title, message, createdAt, href) => ({
  id,
  title,
  message,
  createdAt,
  href,
});

const listAdmin = async () => {
  const [tickets, invites] = await Promise.all([
    prisma.supportTicket.findMany({
      orderBy: { createdAt: 'desc' },
      take: 6,
      select: { id: true, subject: true, senderName: true, status: true, createdAt: true },
    }),
    prisma.gymInvite.findMany({
      orderBy: { createdAt: 'desc' },
      take: 6,
      select: { id: true, email: true, businessName: true, status: true, createdAt: true },
    }),
  ]);

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

  const [enquiries, members] = await Promise.all([
    prisma.enquiry.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 6,
      select: { id: true, name: true, lastName: true, status: true, createdAt: true },
    }),
    prisma.member.findMany({
      where: { deletedAt: null, gym: { tenantId } },
      orderBy: { createdAt: 'desc' },
      take: 6,
      select: { id: true, firstName: true, lastName: true, createdAt: true },
    }),
  ]);

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
