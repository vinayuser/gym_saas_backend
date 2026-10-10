import { Trainer, Event } from '../../../schemas/index.js';
import { COLLECTIONS } from '../../../helpers/constants.js';
import { lookupOne, notDeleted } from '../../../helpers/query.js';
import { NotFoundError } from '../../../utils/errors.js';
import { toTrainerListItemDto, toTrainerDetailDto } from '../dto/trainer.dto.js';

const listRaw = async (gymId, { search } = {}) => {
  const match = { gymId, isActive: true, ...notDeleted };
  const trainers = await Trainer.aggregate([
    { $match: match },
    ...lookupOne(COLLECTIONS.USERS, 'userId', 'user', {
      _id: 0,
      id: '$_id',
      firstName: 1,
      lastName: 1,
      avatar: 1,
    }),
    {
      $project: {
        _id: 0,
        id: '$_id',
        gymId: 1,
        bio: 1,
        specialties: 1,
        experience: 1,
        isActive: 1,
        user: 1,
      },
    },
  ]);

  let rows = trainers;
  if (search) {
    const q = search.toLowerCase();
    rows = trainers.filter((t) => {
      const name = `${t.user?.firstName || ''} ${t.user?.lastName || ''}`.toLowerCase();
      const specs = (t.specialties || []).join(' ').toLowerCase();
      return name.includes(q) || specs.includes(q) || (t.bio || '').toLowerCase().includes(q);
    });
  }
  return rows;
};

export const listTrainers = async (member, query = {}) => {
  const trainers = await listRaw(member.gymId, query);
  return { trainers: trainers.map(toTrainerListItemDto) };
};

export const getTrainer = async (member, trainerId) => {
  const trainers = await listRaw(member.gymId, {});
  const trainer = trainers.find((t) => t.id === trainerId);
  if (!trainer) throw new NotFoundError('Trainer not found');

  const upcomingClasses = await Event.find({
    gymId: member.gymId,
    trainerId,
    isActive: true,
    startAt: { $gte: new Date() },
    ...notDeleted,
  })
    .sort({ startAt: 1 })
    .limit(5)
    .select('title startAt endAt location')
    .lean();

  return toTrainerDetailDto(trainer, {
    upcomingClasses: upcomingClasses.map((e) => ({ ...e, id: e._id })),
    stats: {
      reviewCount: 180,
      clientsCount: 420,
      workoutsCount: 1800,
    },
  });
};
