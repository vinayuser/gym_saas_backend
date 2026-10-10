import { Gym, Tenant } from '../../../schemas/index.js';
import { asDoc } from '../../../helpers/document.js';
import { notDeleted } from '../../../helpers/query.js';
import { BadRequestError } from '../../../utils/errors.js';
import * as PublicGymService from '../../../services/PublicGymService.js';
import { normalizeTenantFeatures } from '../../../constants/tenantFeatures.js';
import { toAppConfigDto } from '../dto/config.dto.js';

const readAddons = (value) => {
  const src = value && typeof value === 'object' ? value : {};
  return {
    attendance: Boolean(src.attendance),
    store: Boolean(src.store),
    day_pass: Boolean(src.day_pass),
  };
};

/**
 * White-label app bootstrap — called on splash with ?alias=
 * No auth. Returns theme, logo, feature flags, ads for that gym app only.
 */
export const getConfig = async ({ alias, slug, code } = {}) => {
  const key = (alias || slug || code || '').trim();
  if (!key) {
    throw new BadRequestError('Query param "alias" is required');
  }

  const branding = await PublicGymService.resolveGym({
    alias: alias || undefined,
    slug: slug || undefined,
    code: code || undefined,
  });

  const gym = asDoc(
    await Gym.findOne({ _id: branding.gymId, ...notDeleted }).select(
      'isActive commercialAddons tenantId'
    )
  );
  const tenant = gym?.tenantId
    ? asDoc(await Tenant.findOne({ _id: gym.tenantId, ...notDeleted }).select('features isActive'))
    : null;

  const features = normalizeTenantFeatures(tenant?.features);
  const addons = readAddons(gym?.commercialAddons);

  return toAppConfigDto(branding, {
    addons,
    features,
    gymActive: gym?.isActive !== false && tenant?.isActive !== false,
  });
};
