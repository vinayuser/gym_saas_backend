import { Membership } from '../../../schemas/index.js';
import { COLLECTIONS } from '../../../helpers/constants.js';
import { lookupOne } from '../../../helpers/query.js';
import { toMembershipDto } from '../dto/member.dto.js';

/** Active (or latest) membership for a member, with plan joined. */
export const loadActiveMembership = async (memberId) => {
  const rows = await Membership.aggregate([
    { $match: { memberId } },
    { $sort: { endDate: -1 } },
    { $limit: 5 },
    ...lookupOne(COLLECTIONS.GYM_MEMBERSHIP_PLANS, 'planId', 'plan', {
      _id: 0,
      id: '$_id',
      name: 1,
      durationDays: 1,
      price: 1,
      billingCycle: 1,
      description: 1,
      features: 1,
    }),
    {
      $project: {
        _id: 0,
        id: '$_id',
        status: 1,
        startDate: 1,
        endDate: 1,
        amountPaid: 1,
        plan: 1,
      },
    },
  ]);

  const active = rows.find((m) => m.status === 'ACTIVE') || rows[0] || null;
  return toMembershipDto(active);
};

export const sessionMetaFromReq = (req) => ({
  userAgent: req.headers['user-agent'],
  ipAddress: req.ip,
});
