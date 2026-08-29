import prisma from '../config/database.js';

export const findMany = (gymId, { skip, limit, search, upcoming, from, to }) => {
  const now = new Date();
  const where = {
    gymId,
    ...(search ? { title: { contains: search, mode: 'insensitive' } } : {}),
    ...(upcoming ? { startAt: { gte: now } } : {}),
    ...(from || to
      ? {
          startAt: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(to) } : {}),
          },
        }
      : {}),
  };
  return Promise.all([
    prisma.event.findMany({
      where,
      skip,
      take: limit,
      orderBy: { startAt: 'asc' },
      include: {
        trainer: { include: { user: { select: { firstName: true, lastName: true } } } },
        _count: { select: { bookings: true } },
      },
    }),
    prisma.event.count({ where }),
  ]);
};

export const findById = (id, gymId) =>
  prisma.event.findFirst({
    where: { id, gymId },
    include: {
      trainer: { include: { user: { select: { firstName: true, lastName: true } } } },
      _count: { select: { bookings: true } },
    },
  });

export const create = (data) => prisma.event.create({ data });
export const createMany = (records) =>
  prisma.$transaction(
    records.map((data) =>
      prisma.event.create({
        data,
        include: {
          trainer: { include: { user: { select: { firstName: true, lastName: true } } } },
          _count: { select: { bookings: true } },
        },
      })
    )
  );
export const update = (id, data) => prisma.event.update({ where: { id }, data });
export const remove = (id) => prisma.event.delete({ where: { id } });
export const removeBySeriesId = (seriesId, gymId) =>
  prisma.event.deleteMany({ where: { seriesId, gymId } });
