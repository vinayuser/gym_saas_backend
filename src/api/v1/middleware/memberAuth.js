import { authenticate } from '../../../middlewares/auth.middleware.js';
import { requireRoles } from '../../../middlewares/rbac.middleware.js';
import { Member, Gym } from '../../../schemas/index.js';
import { asDoc } from '../../../helpers/document.js';
import { notDeleted } from '../../../helpers/query.js';
import { NotFoundError } from '../../../utils/errors.js';

const loadMemberContext = async (req, _res, next) => {
  try {
    const member = asDoc(
      await Member.findOne({ userId: req.user.id, ...notDeleted }).select(
        'gymId tenantId userId memberCode firstName lastName email phone profileImage qrCode preferredSlot lockerNumber lockerZone fitnessGoals emergencyContact emergencyPhone joinedAt isActive'
      )
    );

    if (!member) {
      throw new NotFoundError('No member profile linked to this account');
    }

    const gym = asDoc(
      await Gym.findOne({ _id: member.gymId, ...notDeleted }).select(
        'name slug address city state logo coverImage phone email operatingHours dayPassPrice tenantId primaryColor appTagline images isActive'
      )
    );

    if (!gym) {
      throw new NotFoundError('Home gym not found');
    }

    req.member = member;
    req.memberGym = gym;
    req.tenantId = member.tenantId || gym.tenantId || req.user.tenantId;
    next();
  } catch (err) {
    next(err);
  }
};

/** Auth + MEMBER role + linked member/gym on req. */
export const memberAuth = [authenticate, requireRoles('MEMBER'), loadMemberContext];

/** Auth only (for change-password etc. before member context is needed). */
export const memberAuthOptionalContext = [authenticate, requireRoles('MEMBER')];
