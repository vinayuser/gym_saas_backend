import { money, fullName, iso } from './common.js';

export const toEventListItemDto = (event, { booked = false } = {}) => {
  const startAt = event.startAt ? new Date(event.startAt) : null;
  const endAt = event.endAt ? new Date(event.endAt) : null;
  const now = new Date();
  let registrationStatus = 'Join';
  if (booked) {
    registrationStatus = startAt && startAt < now ? 'Attended' : 'Details';
  } else if (event.price && Number(event.price) > 0) {
    registrationStatus = 'Register';
  }

  return {
    id: event.id,
    title: event.title,
    subtitle: event.description?.slice(0, 120) || null,
    category: event.type || null,
    coverImage: event.imageUrl || null,
    thumbnailUrl: event.imageUrl || null,
    date: iso(event.startAt),
    startAt: iso(event.startAt),
    endAt: iso(event.endAt),
    location: event.location || null,
    instructor: event.trainerName || null,
    seatsLeft:
      event.seatLimit != null
        ? Math.max(0, Number(event.seatLimit) - Number(event.participantCount || 0))
        : null,
    seatLimit: event.seatLimit ?? null,
    participantCount: event.participantCount ?? 0,
    price: money(event.price),
    priceLabel:
      event.price == null || Number(event.price) === 0 ? 'Free for Members' : `₹${Number(event.price)}`,
    booked: Boolean(booked || event.booked),
    registrationStatus,
  };
};

export const toEventDetailDto = (event, extras = {}) => ({
  ...toEventListItemDto(event, { booked: extras.booked }),
  description: event.description || null,
  highlights: extras.highlights || [],
  attendeePreview: extras.attendeePreview || [],
  attendeeExtraCount: extras.attendeeExtraCount ?? 0,
  coach: extras.coach || event.trainerName || null,
  coachTitle: extras.coachTitle || null,
  bookmarked: Boolean(extras.bookmarked),
});

export const toBookingConfirmedDto = (event, booking) => ({
  eventId: event.id,
  bookingId: booking?.id || null,
  eventTitle: event.title,
  date: iso(event.startAt),
  startAt: iso(event.startAt),
  endAt: iso(event.endAt),
  location: event.location || null,
  status: 'Confirmed',
  tierAccess: event.price == null || Number(event.price) === 0 ? 'Free Member Event' : 'Paid Event',
  coach: event.trainerName || 'Gym Team',
});

export const toChatMessageDto = (m, userId) => ({
  id: m.id,
  gymId: m.gymId,
  content: m.content || '',
  mediaUrl: m.mediaUrl || null,
  mediaType: m.mediaType || null,
  isPinned: Boolean(m.isPinned),
  createdAt: iso(m.createdAt),
  isOwn: m.senderId === userId,
  sender: m.sender
    ? {
        id: m.sender.id,
        firstName: m.sender.firstName,
        lastName: m.sender.lastName,
        name: fullName(m.sender.firstName, m.sender.lastName),
        role: m.sender.role || null,
        avatar: m.sender.avatar || null,
        roleBadge: m.sender.role === 'TRAINER' ? 'Trainer' : null,
      }
    : null,
});
