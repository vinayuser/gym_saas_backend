import { APP_AD_CHANNELS, DEFAULT_APP_ADS } from './constants.js';

export const normalizeAppAds = (value, adsEnabled) => {
  const src = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  return {
    banners: src.banners !== undefined ? Boolean(src.banners) : adsEnabled !== false,
    video: Boolean(src.video),
    audio: Boolean(src.audio),
  };
};

export const patchAppAds = (current, input) => {
  const next = { ...DEFAULT_APP_ADS, ...current };
  for (const key of APP_AD_CHANNELS) {
    if (typeof input?.[key] === 'boolean') next[key] = input[key];
  }
  return next;
};

export const appAdsWrite = (next) => ({
  appAds: next,
  adsEnabled: next.banners,
});
