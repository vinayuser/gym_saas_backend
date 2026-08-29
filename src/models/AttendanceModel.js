import prisma from '../config/database.js';

export const findMany = (gymId, { skip, limit, date }) => {
  const dayStart = date ? new Date(date) : new Date();
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const where = {
    gymId,
    checkInAt: { gte: dayStart, lt: dayEnd },
  };

  return Promise.all([
    prisma.attendance.findMany({
      where,
      skip,
      take: limit,
      orderBy: { checkInAt: 'desc' },
      include: {
        member: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            memberCode: true,
            memberships: {
              where: { status: 'ACTIVE' },
              take: 1,
              include: { plan: { select: { name: true } } },
            },
          },
        },
      },
    }),
    prisma.attendance.count({ where }),
  ]);
};

export const todayStats = async (gymId) => {
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  const where = { gymId, checkInAt: { gte: dayStart, lt: dayEnd } };

  const [totalToday, currentlyInside] = await Promise.all([
    prisma.attendance.count({ where }),
    prisma.attendance.count({
      where: { ...where, type: 'CHECK_IN', checkOutAt: null },
    }),
  ]);

  const hourly = await prisma.$queryRaw`
    SELECT EXTRACT(HOUR FROM "checkInAt")::int as hour, COUNT(*)::int as count
    FROM attendance
    WHERE "gymId" = ${gymId}
      AND "checkInAt" >= ${dayStart}
      AND "checkInAt" < ${dayEnd}
    GROUP BY hour
    ORDER BY hour
  `.catch(() => []);

  return { totalToday, currentlyInside, hourly };
};

export const create = (data) => prisma.attendance.create({ data });
