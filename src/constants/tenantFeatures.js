export const DEFAULT_TENANT_FEATURES = {
  banners: true,
  store: true,
  finances: true,
  events: true,
  chat: true,
  trainers: true,
  leads: true,
  attendance: true,
};

export const TENANT_FEATURE_KEYS = Object.keys(DEFAULT_TENANT_FEATURES);

export const normalizeTenantFeatures = (value) => {
  const src = value && typeof value === 'object' ? value : {};
  const out = {};
  for (const key of TENANT_FEATURE_KEYS) {
    out[key] = src[key] === undefined ? DEFAULT_TENANT_FEATURES[key] : Boolean(src[key]);
  }
  return out;
};
