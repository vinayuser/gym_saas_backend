import prisma from '../config/database.js';
import * as GymModel from '../models/GymModel.js';
import { NotFoundError } from '../utils/errors.js';

export const performance = async (tenantId, gymId) => {
  const gym = await GymModel.findById(gymId, tenantId);
  if (!gym) throw new NotFoundError('Gym not found');

  const trainers = await prisma.trainer.findMany({
    where: { gymId, isActive: true },
    include: {
      user: { select: { firstName: true, lastName: true, email: true } },
      events: { include: { _count: { select: { bookings: true } } } },
    },
  });

  const totalSessions = trainers.reduce(
    (s, t) => s + t.events.reduce((es, e) => es + e._count.bookings, 0),
    0
  );

  return {
    summary: {
      activeTrainers: trainers.length,
      avgRating: trainers.length ? 4.8 : 0,
      totalSessions,
      efficiency: trainers.length ? 86 : 0,
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
  };
};
