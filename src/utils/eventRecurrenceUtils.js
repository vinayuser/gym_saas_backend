import { randomUUID } from 'crypto';

const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const endOfDay = (d) => {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
};

const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

const applyTime = (date, source) => {
  const d = startOfDay(date);
  d.setHours(source.getHours(), source.getMinutes(), source.getSeconds(), 0);
  return d;
};

const getMonthlyOccurrenceDate = (year, month, weekOfMonth, dayOfWeek) => {
  const matches = [];
  const cursor = new Date(year, month, 1);
  while (cursor.getMonth() === month) {
    if (cursor.getDay() === dayOfWeek) matches.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  if (!matches.length) return null;
  if (weekOfMonth === 5) return matches[matches.length - 1];
  return matches[weekOfMonth - 1] || null;
};

const MAX_OCCURRENCES = 500;

/**
 * Build concrete start/end pairs for every calendar slot in a recurring span.
 * Each pair becomes one persisted event row.
 */
export const generateEventOccurrences = (body) => {
  const baseStart = new Date(body.startAt);
  const baseEnd = new Date(body.endAt);
  const durationMs = baseEnd.getTime() - baseStart.getTime();
  const recurrence = body.recurrence || 'NONE';

  if (recurrence === 'NONE') {
    return [{ startAt: baseStart, endAt: baseEnd }];
  }

  if (!body.recurrenceEndAt) {
    throw new Error('recurrenceEndAt is required for recurring events');
  }

  const seriesEnd = endOfDay(new Date(body.recurrenceEndAt));
  const seriesStart = startOfDay(baseStart);
  const starts = [];

  if (recurrence === 'DAILY') {
    let cursor = new Date(seriesStart);
    let guard = 0;
    while (cursor <= seriesEnd && guard < MAX_OCCURRENCES) {
      guard += 1;
      starts.push(applyTime(cursor, baseStart));
      cursor = addDays(cursor, 1);
    }
  } else if (recurrence === 'WEEKLY') {
    const weekdays =
      body.recurrenceWeekdays?.length > 0 ? body.recurrenceWeekdays : [baseStart.getDay()];
    let cursor = new Date(seriesStart);
    let guard = 0;
    while (cursor <= seriesEnd && guard < MAX_OCCURRENCES) {
      guard += 1;
      if (weekdays.includes(cursor.getDay())) {
        const instanceStart = applyTime(cursor, baseStart);
        if (instanceStart >= baseStart) starts.push(instanceStart);
      }
      cursor = addDays(cursor, 1);
    }
  } else if (recurrence === 'MONTHLY') {
    const weekOfMonth = body.recurrenceWeekOfMonth ?? Math.ceil(baseStart.getDate() / 7);
    const dayOfWeek = body.recurrenceDayOfWeek ?? baseStart.getDay();
    let y = seriesStart.getFullYear();
    let m = seriesStart.getMonth();
    const endY = seriesEnd.getFullYear();
    const endM = seriesEnd.getMonth();
    let guard = 0;

    while ((y < endY || (y === endY && m <= endM)) && guard < MAX_OCCURRENCES) {
      guard += 1;
      const occ = getMonthlyOccurrenceDate(y, m, weekOfMonth, dayOfWeek);
      if (occ) {
        const instanceStart = applyTime(occ, baseStart);
        if (instanceStart >= baseStart && instanceStart <= seriesEnd) {
          starts.push(instanceStart);
        }
      }
      m += 1;
      if (m > 11) {
        m = 0;
        y += 1;
      }
    }
  }

  if (!starts.length) {
    return [{ startAt: baseStart, endAt: baseEnd }];
  }

  return starts.slice(0, MAX_OCCURRENCES).map((startAt) => ({
    startAt,
    endAt: new Date(startAt.getTime() + durationMs),
  }));
};

export const newSeriesId = () => randomUUID();
