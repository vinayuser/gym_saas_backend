import prisma from '../config/database.js';

export const findMany = (gymId, { skip, limit, date, days = 30 }) => {
  const where = { gymId };
  if (date) {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    where.checkInAt = { gte: dayStart, lt: dayEnd };
  } else {
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    from.setDate(from.getDate() - (days - 1));
    where.checkInAt = { gte: from };
  }

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

  const rows = await prisma.attendance.findMany({
    where,
    select: { checkInAt: true },
  });
  const counts = Array.from({ length: 24 }, () => 0);
  rows.forEach((row) => {
    counts[new Date(row.checkInAt).getHours()] += 1;
  });
  const hourly = counts
    .map((count, hour) => ({ hour, count }))
    .filter((item) => item.hour >= 6 && item.hour <= 22);

  return { totalToday, currentlyInside, hourly };
};

export const dailyTrend = async (gymId, days = 14) => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));

  const rows = await prisma.attendance.findMany({
    where: { gymId, checkInAt: { gte: start } },
    select: { checkInAt: true },
  });

  const buckets = Array.from({ length: days }, (_, i) => {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    return {
      key: day.toDateString(),
      label: day.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
      count: 0,
    };
  });
  const index = Object.fromEntries(buckets.map((bucket, i) => [bucket.key, i]));
  rows.forEach((row) => {
    const key = new Date(row.checkInAt).toDateString();
    if (key in index) buckets[index[key]].count += 1;
  });
  return buckets.map(({ label, count }) => ({ label, count }));
};

export const create = (data) => prisma.attendance.create({ data });
