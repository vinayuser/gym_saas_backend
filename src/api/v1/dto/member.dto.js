import { money, fullName, iso, durationLabel } from './common.js';

export const toGymSummaryDto = (gym) => {
  if (!gym) return null;
  return {
    id: gym.id || gym._id,
    name: gym.name,
    slug: gym.slug || null,
    address: gym.address || null,
    city: gym.city || null,
    state: gym.state || null,
    phone: gym.phone || null,
    email: gym.email || null,
    logo: gym.logo || null,
    coverImage: gym.coverImage || null,
    dayPassPrice: money(gym.dayPassPrice),
    primaryColor: gym.primaryColor || null,
    appTagline: gym.appTagline || null,
    images: gym.images || [],
  };
};

export const toMembershipDto = (membership) => {
  if (!membership) return null;
  const plan = membership.plan || null;
  return {
    id: membership.id,
    status: membership.status,
    startDate: iso(membership.startDate),
    endDate: iso(membership.endDate),
    amountPaid: money(membership.amountPaid),
    planName: plan?.name || null,
    planPrice: money(plan?.price),
    billingCycle: plan?.billingCycle || null,
    tier: plan?.name || 'Standard',
    perks: Array.isArray(plan?.features)
      ? plan.features
      : plan?.features && typeof plan.features === 'object'
        ? Object.values(plan.features).filter(Boolean)
        : plan?.description
          ? [plan.description]
          : [],
    nextPaymentAmount: money(plan?.price),
    dueDate: iso(membership.endDate),
    plan: plan
      ? {
          id: plan.id,
          name: plan.name,
          price: money(plan.price),
          billingCycle: plan.billingCycle,
          durationDays: plan.durationDays,
          description: plan.description || null,
        }
      : null,
  };
};

export const toMemberSummaryDto = (member, gym, membership) => ({
  id: member.id,
  memberCode: member.memberCode,
  firstName: member.firstName,
  lastName: member.lastName,
  fullName: fullName(member.firstName, member.lastName),
  email: member.email || null,
  phone: member.phone || null,
  profileImage: member.profileImage || null,
  joinedAt: iso(member.joinedAt),
  preferredSlot: member.preferredSlot || null,
  lockerNumber: member.lockerNumber || null,
  lockerZone: member.lockerZone || null,
  gym: toGymSummaryDto(gym),
  membership: toMembershipDto(membership),
});

export const toProfileDto = (member, gym, membership, stats = {}) => ({
  ...toMemberSummaryDto(member, gym, membership),
  fitnessGoals: member.fitnessGoals || null,
  emergencyContact: member.emergencyContact || null,
  emergencyPhone: member.emergencyPhone || null,
  emailVerified: Boolean(stats.emailVerified),
  stats: {
    workouts: stats.workouts ?? 0,
    streak: stats.streak ?? 0,
    fitPoints: stats.fitPoints ?? 0,
  },
  appVersion: stats.appVersion || null,
});

export const toAttendanceVisitDto = (row) => ({
  id: row.id,
  type: row.type || 'Regular Workout',
  source: row.source || null,
  checkInAt: iso(row.checkInAt),
  checkOutAt: iso(row.checkOutAt),
  duration: durationLabel(row.checkInAt, row.checkOutAt),
  status: row.checkOutAt ? 'Completed' : 'In Progress',
});

export const toAttendanceSummaryDto = ({ daysAttended, monthlyTarget, weekBars, visits }) => ({
  daysAttended,
  monthlyTarget,
  progressPct: monthlyTarget > 0 ? Math.min(100, Math.round((daysAttended / monthlyTarget) * 100)) : 0,
  onTrack: daysAttended >= Math.ceil(monthlyTarget * 0.7),
  weekBars: weekBars || [],
  visits: (visits || []).map(toAttendanceVisitDto),
});

export const toCheckInPassDto = ({ member, gym, membership, qrPayload, qrExpiresAt, expiresInSec }) => ({
  memberName: fullName(member.firstName, member.lastName),
  planName: membership?.planName || membership?.plan?.name || null,
  memberCode: member.memberCode,
  branchLabel: gym ? `${gym.name}${gym.city ? ` • ${gym.city}` : ''}` : null,
  status: membership?.status === 'ACTIVE' ? 'VALID TODAY • ACTIVE PASS' : membership?.status || 'INACTIVE',
  preferredSlot: member.preferredSlot || null,
  lockerNumber: member.lockerNumber || null,
  lockerZone: member.lockerZone || null,
  qrPayload,
  qrExpiresAt: iso(qrExpiresAt),
  expiresInSec,
});

export const toGymTimingDto = (operatingHours, preferredSlot) => {
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const todayIdx = (new Date().getDay() + 6) % 7; // Mon=0
  const hours = operatingHours && typeof operatingHours === 'object' ? operatingHours : {};

  return {
    preferredSlot: preferredSlot || null,
    weeklyHours: days.map((key, i) => {
      const entry = hours[key] || hours[labels[i]] || hours[key.slice(0, 3)] || null;
      let open = null;
      let close = null;
      let closed = false;
      if (typeof entry === 'string') {
        const parts = entry.split(/-|–|to/i).map((s) => s.trim());
        open = parts[0] || null;
        close = parts[1] || null;
      } else if (entry && typeof entry === 'object') {
        open = entry.open || entry.start || null;
        close = entry.close || entry.end || null;
        closed = Boolean(entry.closed);
      } else if (!entry) {
        closed = false;
        open = '6:00 AM';
        close = '10:00 PM';
      }
      return {
        day: labels[i],
        dayKey: key,
        open,
        close,
        closed,
        isToday: i === todayIdx,
      };
    }),
  };
};
