import crypto from 'crypto';
import { DayPass, Gym } from '../../../schemas/index.js';
import { asDoc, createDoc, updateById } from '../../../helpers/document.js';
import { notDeleted } from '../../../helpers/query.js';
import { NotFoundError, BadRequestError } from '../../../utils/errors.js';
import * as RazorpayService from '../../../services/RazorpayService.js';
import {
  toPartnerGymDto,
  toPartnerGymDetailDto,
  toDayPassListItemDto,
  toDayPassDetailDto,
  toDayPassCheckoutDto,
  toDayPassConfirmedDto,
  dayPassStatusLabel,
} from '../dto/dayPass.dto.js';

const DEFAULT_PRICE = 299;

const siblingGyms = async (tenantId, homeGymId, { search } = {}) => {
  const match = {
    tenantId,
    isActive: true,
    ...notDeleted,
    _id: { $ne: homeGymId },
  };
  if (search) {
    match.$or = [
      { name: { $regex: search, $options: 'i' } },
      { city: { $regex: search, $options: 'i' } },
      { address: { $regex: search, $options: 'i' } },
    ];
  }

  const gyms = await Gym.find(match)
    .select('name slug address city state logo coverImage images appTagline description phone dayPassPrice operatingHours')
    .sort({ name: 1 })
    .lean();

  return gyms.map((g) => ({ ...g, id: g._id }));
};

export const listPartnerGyms = async (member, gym, query = {}) => {
  const tenantId = member.tenantId || gym.tenantId;
  const gyms = await siblingGyms(tenantId, member.gymId, query);
  return {
    gyms: gyms.map((g, i) =>
      toPartnerGymDto(
        { ...g, dayPassPrice: g.dayPassPrice ?? DEFAULT_PRICE },
        { distanceKm: query.nearby ? Number((1.2 + i * 0.8).toFixed(1)) : null }
      )
    ),
  };
};

export const getPartnerGym = async (member, gym, gymId) => {
  const tenantId = member.tenantId || gym.tenantId;
  const partner = asDoc(
    await Gym.findOne({ _id: gymId, tenantId, isActive: true, ...notDeleted })
  );
  if (!partner || partner.id === member.gymId) {
    throw new NotFoundError('Partner gym not found');
  }
  return toPartnerGymDetailDto({
    ...partner,
    dayPassPrice: partner.dayPassPrice ?? DEFAULT_PRICE,
  });
};

export const getAvailability = async (member, gym, gymId, { month } = {}) => {
  await getPartnerGym(member, gym, gymId);

  let year;
  let mon;
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    [year, mon] = month.split('-').map(Number);
  } else {
    const now = new Date();
    year = now.getFullYear();
    mon = now.getMonth() + 1;
  }

  const daysInMonth = new Date(year, mon, 0).getDate();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const availableDates = [];
  for (let d = 1; d <= daysInMonth; d += 1) {
    const date = new Date(year, mon - 1, d);
    if (date >= today) {
      availableDates.push(date.toISOString().slice(0, 10));
    }
  }

  return {
    month: `${year}-${String(mon).padStart(2, '0')}`,
    availableDates,
  };
};

const makeCodes = () => {
  const n = crypto.randomInt(10000, 99999);
  return {
    bookingCode: `FZ-DP-${n}`,
    passCode: `DP-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
    paymentRef: `FZ-PAY-${n}`,
  };
};

const issueQr = (passId, memberId, gymId) => {
  const qrToken = `dpass:${passId}:${memberId}:${gymId}:${crypto.randomBytes(6).toString('hex')}`;
  const qrExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return { qrToken, qrExpiresAt };
};

export const checkout = async (member, gym, body) => {
  const gymId = body.gymId;
  const validOnRaw = body.validOn || body.date;
  if (!gymId || !validOnRaw) throw new BadRequestError('gymId and validOn are required');

  const partner = await getPartnerGym(member, gym, gymId);
  const validOn = new Date(validOnRaw);
  if (Number.isNaN(validOn.getTime())) throw new BadRequestError('Invalid date');
  validOn.setHours(12, 0, 0, 0);

  const amount = partner.dayPassPrice ?? DEFAULT_PRICE;
  const codes = makeCodes();
  const tenantId = member.tenantId || gym.tenantId;

  const pass = await createDoc(DayPass, {
    gymId,
    tenantId,
    memberId: member.id,
    userId: member.userId,
    guestName: `${member.firstName} ${member.lastName}`.trim(),
    phone: member.phone || null,
    email: member.email || null,
    amount,
    paid: false,
    status: 'PENDING_PAYMENT',
    validOn,
    bookingCode: codes.bookingCode,
    passCode: codes.passCode,
    paymentRef: codes.paymentRef,
  });

  const order = await RazorpayService.createOrder({
    amountInr: amount,
    receipt: codes.bookingCode.slice(0, 40),
    notes: { dayPassId: pass.id, memberId: member.id, gymId },
  });

  const updated = await updateById(DayPass, pass.id, {
    razorpayOrderId: order.id,
  });

  const partnerGym = asDoc(await Gym.findById(gymId));

  return toDayPassCheckoutDto({
    pass: updated,
    gym: partnerGym,
    payment: {
      orderId: order.id,
      amount,
      currency: 'INR',
      keyId: RazorpayService.getPublicKey(),
      mock: Boolean(order.mock) || !RazorpayService.isConfigured(),
    },
  });
};

export const verifyPayment = async (member, gym, body) => {
  const orderId = body.razorpay_order_id || body.orderId;
  const paymentId = body.razorpay_payment_id || body.paymentId || `pay_mock_${Date.now()}`;
  const signature = body.razorpay_signature || body.signature;
  const failed = Boolean(body.failed);

  if (!orderId) throw new BadRequestError('orderId is required');

  const pass = asDoc(await DayPass.findOne({ razorpayOrderId: orderId, memberId: member.id }));
  if (!pass) throw new NotFoundError('Day pass booking not found');

  const partnerGym = asDoc(await Gym.findById(pass.gymId));

  if (failed) {
    const updated = await updateById(DayPass, pass.id, {
      status: 'FAILED',
      paid: false,
      razorpayPaymentId: paymentId,
    });
    return {
      success: false,
      pass: toDayPassDetailDto(updated, partnerGym),
      failureReason: body.failureReason || 'Payment could not be completed. Please try again.',
    };
  }

  const isMock = String(orderId).startsWith('order_mock_');
  if (RazorpayService.isConfigured() && !isMock && signature) {
    RazorpayService.verifyPaymentSignature({ orderId, paymentId, signature });
  }

  const qr = issueQr(pass.id, member.id, pass.gymId);
  const updated = await updateById(DayPass, pass.id, {
    status: 'ACTIVE',
    paid: true,
    razorpayPaymentId: paymentId,
    ...qr,
  });

  return {
    success: true,
    pass: toDayPassConfirmedDto(updated, partnerGym),
  };
};

export const listMyDayPasses = async (member) => {
  const rows = await DayPass.find({ memberId: member.id, ...notDeleted })
    .sort({ validOn: -1 })
    .lean();

  const gymIds = [...new Set(rows.map((r) => r.gymId))];
  const gyms = await Gym.find({ _id: { $in: gymIds } }).lean();
  const byId = Object.fromEntries(gyms.map((g) => [g._id, { ...g, id: g._id }]));

  const passes = rows.map((r) =>
    toDayPassListItemDto({ ...r, id: r._id }, byId[r.gymId])
  );

  const activeCount = passes.filter((p) => ['Upcoming', 'Active'].includes(p.statusLabel)).length;

  return {
    activeCount,
    total: passes.length,
    passes,
  };
};

export const getDayPass = async (member, passId) => {
  const pass = asDoc(await DayPass.findOne({ _id: passId, memberId: member.id, ...notDeleted }));
  if (!pass) throw new NotFoundError('Day pass not found');

  // refresh expired status lazily
  if (dayPassStatusLabel(pass) === 'Expired' && pass.status === 'ACTIVE') {
    await updateById(DayPass, pass.id, { status: 'EXPIRED' });
    pass.status = 'EXPIRED';
  }

  if (pass.status === 'ACTIVE' && !pass.qrToken) {
    const qr = issueQr(pass.id, member.id, pass.gymId);
    Object.assign(pass, await updateById(DayPass, pass.id, qr));
  }

  const partnerGym = asDoc(await Gym.findById(pass.gymId));
  return toDayPassDetailDto(pass, partnerGym);
};
