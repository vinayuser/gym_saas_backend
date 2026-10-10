import { fullName, iso } from './common.js';

export const toTrainerListItemDto = (t) => {
  const name = t.user ? fullName(t.user.firstName, t.user.lastName) : t.name || 'Trainer';
  return {
    id: t.id,
    name,
    firstName: t.user?.firstName || null,
    lastName: t.user?.lastName || null,
    avatar: t.user?.avatar || null,
    specialty: t.specialties?.[0] || 'Fitness',
    specialties: t.specialties || [],
    rating: t.rating ?? 4.8,
    experienceYears: t.experience ?? 0,
    bio: t.bio || null,
    isActive: t.isActive !== false,
  };
};

export const toTrainerDetailDto = (t, { upcomingClasses = [], stats = {} } = {}) => ({
  ...toTrainerListItemDto(t),
  reviewCount: stats.reviewCount ?? null,
  clientsCount: stats.clientsCount ?? null,
  workoutsCount: stats.workoutsCount ?? null,
  focus: t.specialties?.[0] || 'General Fitness',
  availability: t.isActive !== false ? 'Available' : 'Unavailable',
  upcomingClasses: upcomingClasses.map((e) => ({
    id: e.id,
    title: e.title,
    startAt: iso(e.startAt),
    endAt: iso(e.endAt),
    location: e.location || null,
  })),
});
