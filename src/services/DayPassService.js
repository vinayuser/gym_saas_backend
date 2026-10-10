import * as DayPassModel from '../models/DayPassModel.js';
import * as GymModel from '../models/GymModel.js';
import { BadRequestError, NotFoundError } from '../utils/errors.js';
import { parsePagination, buildPaginationMeta } from '../utils/response.js';

const validateGym = async (tenantId, gymId) => {
  const gym = await GymModel.findById(gymId, tenantId);
  if (!gym) throw new NotFoundError('Gym not found');
  return gym;
};

const assertDayPassOn = (gym) => {
  const addons = gym.commercialAddons && typeof gym.commercialAddons === 'object' ? gym.commercialAddons : {};
  if (addons.day_pass === false) {
    throw new BadRequestError('Day pass is not enabled for this gym');
  }
};

const serialize = (row) => ({
  ...row,
  amount: Number(row.amount),
});

export const list = async (tenantId, gymId, query) => {
  await validateGym(tenantId, gymId);
  const pagination = parsePagination(query);
  const [rows, total] = await DayPassModel.findMany(gymId, {
    ...pagination,
    date: query.date,
    search: pagination.search,
  });
  const stats = await DayPassModel.todayStats(gymId);
  return {
    passes: rows.map(serialize),
    stats,
    pagination: buildPaginationMeta(total, pagination.page, pagination.limit),
  };
};

export const create = async (tenantId, gymId, body) => {
  const gym = await validateGym(tenantId, gymId);
  assertDayPassOn(gym);
  const amount = body.amount != null ? Number(body.amount) : Number(gym.dayPassPrice || 0);
  if (!amount && amount !== 0) throw new BadRequestError('Set a day-pass price first');
  const validOn = body.validOn ? new Date(body.validOn) : new Date();
  validOn.setHours(12, 0, 0, 0);
  const pass = await DayPassModel.create({
    gymId,
    guestName: body.guestName.trim(),
    phone: body.phone || null,
    email: body.email || null,
    amount,
    paid: body.paid !== false,
    validOn,
    notes: body.notes || null,
  });
  return serialize(pass);
};

export const checkIn = async (tenantId, gymId, passId) => {
  await validateGym(tenantId, gymId);
  const pass = await DayPassModel.findById(passId, gymId);
  if (!pass) throw new NotFoundError('Day pass not found');
  if (pass.checkedInAt) throw new BadRequestError('Guest already checked in');
  const updated = await DayPassModel.update(passId, { checkedInAt: new Date() });
  return serialize(updated);
};
