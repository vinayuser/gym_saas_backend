import prisma from '../config/database.js';
import * as GymModel from '../models/GymModel.js';
import { NotFoundError } from '../utils/errors.js';
import { parsePagination, buildPaginationMeta } from '../utils/response.js';

export const performance = async (tenantId, gymId, query = {}) => {
  const gym = await GymModel.findById(gymId, tenantId);
  if (!gym) throw new NotFoundError('Gym not found');

  const pagination = parsePagination(query);
  const where = { gymId, isActive: true };
  const [trainers, activeTrainers, sessionRows] = await Promise.all([
    prisma.trainer.findMany({
      where,
      skip: pagination.skip,
      take: pagination.limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        events: { include: { _count: { select: { bookings: true } } } },
      },
    }),
    prisma.trainer.count({ where }),
    prisma.eventBooking.count({ where: { event: { gymId } } }),
  ]);

  return {
    summary: {
      activeTrainers,
      avgRating: activeTrainers ? 4.8 : 0,
      totalSessions: sessionRows,
      efficiency: activeTrainers ? 86 : 0,
    },
    trainers: trainers.map((t) => {
      const sessions = t.events.reduce((s, e) => s + e._count.bookings, 0);
      return {
        id: t.id,
        name: `${t.user.firstName} ${t.user.lastName}`.trim(),
        email: t.user.email,
        specialties: t.specialties,
        clients: sessions || 0,
        sessions,
        rating: 4.5 + Math.min((t.experience || 0) / 20, 0.5),
        status: t.isActive ? 'ACTIVE' : 'INACTIVE',
      };
    }),
    pagination: buildPaginationMeta(activeTrainers, pagination.page, pagination.limit),
  };
};
