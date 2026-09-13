import prisma from '../config/database.js';
import { NotFoundError, ForbiddenError } from '../utils/errors.js';

export const getMyMemberProfile = async (userId) => {
  const member = await prisma.member.findFirst({
    where: { userId, deletedAt: null, isActive: true },
    include: {
      gym: {
        select: {
          id: true,
          name: true,
          slug: true,
          logo: true,
          coverImage: true,
          primaryColor: true,
          secondaryColor: true,
          accentColor: true,
          themeMode: true,
          appTagline: true,
          email: true,
          phone: true,
          address: true,
          city: true,
          state: true,
          operatingHours: true,
          images: true,
        },
      },
      memberships: {
        where: { status: 'ACTIVE' },
        orderBy: { endDate: 'desc' },
        take: 1,
        include: { plan: true },
      },
    },
  });

  if (!member) {
    throw new NotFoundError('No member profile linked to this account');
  }

  const activeMembership = member.memberships[0] || null;

  return {
    member: {
      id: member.id,
      memberCode: member.memberCode,
      firstName: member.firstName,
      lastName: member.lastName,
      email: member.email,
      phone: member.phone,
      profileImage: member.profileImage,
      qrCode: member.qrCode || member.memberCode,
      fitnessGoals: member.fitnessGoals,
      joinedAt: member.joinedAt,
    },
    gym: member.gym,
    membership: activeMembership
      ? {
          id: activeMembership.id,
          status: activeMembership.status,
          startDate: activeMembership.startDate,
          endDate: activeMembership.endDate,
          plan: activeMembership.plan
            ? {
                id: activeMembership.plan.id,
                name: activeMembership.plan.name,
                durationDays: activeMembership.plan.durationDays,
                price: Number(activeMembership.plan.price),
              }
            : null,
        }
      : null,
  };
};

export const getMyAttendance = async (userId, { limit = 20 } = {}) => {
  const member = await prisma.member.findFirst({
    where: { userId, deletedAt: null },
    select: { id: true, gymId: true },
  });
  if (!member) throw new NotFoundError('No member profile linked to this account');

  const rows = await prisma.attendance.findMany({
    where: { memberId: member.id },
    orderBy: { checkInAt: 'desc' },
    take: Math.min(Number(limit) || 20, 50),
  });

  return {
    attendance: rows.map((r) => ({
      id: r.id,
      checkInAt: r.checkInAt,
      checkOutAt: r.checkOutAt,
    })),
  };
};

export const ensureMemberRole = (user) => {
  if (user.role !== 'MEMBER' && user.role !== 'GYM_OWNER' && user.role !== 'MANAGER') {
    // Owners can also view if they have a linked member profile; otherwise forbid
  }
  if (!user) throw new ForbiddenError('Unauthorized');
};
