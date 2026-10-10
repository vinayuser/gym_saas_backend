import { money, iso } from './common.js';
import { toGymSummaryDto } from './member.dto.js';

export const toPartnerGymDto = (gym, { distanceKm = null } = {}) => ({
  id: gym.id,
  name: gym.name,
  rating: gym.rating ?? 4.8,
  reviewCount: gym.reviewCount ?? null,
  area: gym.city || gym.address || null,
  address: gym.address || null,
  distanceKm,
  specialty: gym.appTagline || gym.description?.slice(0, 60) || null,
  dayPassPrice: money(gym.dayPassPrice) ?? 299,
  imageUrl: gym.coverImage || gym.logo || gym.images?.[0] || null,
  amenities: gym.amenities || ['AC', 'Lockers & Shower'],
  hoursLabel: '6 AM–10 PM',
  openToday: true,
});

export const toPartnerGymDetailDto = (gym, { benefits } = {}) => ({
  ...toPartnerGymDto(gym),
  description: gym.description || null,
  phone: gym.phone || null,
  benefits: benefits || [
    'Full day gym access',
    'Locker & shower',
    'Free cancellation until visit day',
  ],
  freeCancellation: true,
});

export const dayPassStatusLabel = (pass) => {
  const validOn = pass.validOn ? new Date(pass.validOn) : null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (pass.status === 'FAILED' || pass.status === 'CANCELLED') return pass.status === 'FAILED' ? 'Failed' : 'Cancelled';
  if (pass.status === 'PENDING_PAYMENT') return 'Unpaid';
  if (pass.status === 'USED' || pass.checkedInAt) return 'Used';
  if (pass.status === 'EXPIRED' || (validOn && validOn < today && !pass.checkedInAt)) return 'Expired';
  if (validOn && validOn > today) return 'Upcoming';
  return 'Active';
};

export const toDayPassListItemDto = (pass, gym) => ({
  id: pass.id,
  bookingCode: pass.bookingCode || null,
  passCode: pass.passCode || null,
  status: pass.status,
  statusLabel: dayPassStatusLabel(pass),
  validOn: iso(pass.validOn),
  amount: money(pass.amount),
  gym: gym ? toGymSummaryDto(gym) : toGymSummaryDto({ id: pass.gymId, name: pass.gymName }),
  paymentRef: pass.paymentRef || null,
});

export const toDayPassDetailDto = (pass, gym) => ({
  ...toDayPassListItemDto(pass, gym),
  accessLabel: '1-Day Visit',
  entryLabel: 'Instant Access',
  qrPayload: pass.qrToken || null,
  qrExpiresAt: iso(pass.qrExpiresAt),
  paid: Boolean(pass.paid),
  razorpayOrderId: pass.razorpayOrderId || null,
  checkedInAt: iso(pass.checkedInAt),
});

export const toDayPassCheckoutDto = ({ pass, gym, payment }) => ({
  pass: toDayPassDetailDto(pass, gym),
  payment: {
    orderId: payment.orderId,
    amount: money(payment.amount),
    currency: payment.currency || 'INR',
    keyId: payment.keyId || null,
    mock: Boolean(payment.mock),
  },
  summary: {
    gymName: gym?.name || null,
    address: gym?.address || null,
    passType: 'One-day',
    date: iso(pass.validOn),
    entry: 'Instant Access',
    total: money(pass.amount),
  },
});

export const toDayPassConfirmedDto = (pass, gym) => ({
  ...toDayPassDetailDto(pass, gym),
  status: 'ACTIVE',
  statusLabel: 'Active Pass',
  amountPaid: money(pass.amount),
});
