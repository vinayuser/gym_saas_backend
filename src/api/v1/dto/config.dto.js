/**
 * Splash / bootstrap config for a white-label member app.
 * Resolved by gym appAlias (no auth).
 */
export const toAppConfigDto = (branding, { addons = {}, features = {}, gymActive = true } = {}) => {
  const appAds = branding.appAds || { banners: false, video: false, audio: false };
  const published = Boolean(branding.appPublished);
  const disabled = !published || !gymActive;

  return {
    gymId: branding.gymId,
    name: branding.name,
    slug: branding.slug,
    appAlias: branding.appAlias,
    tagline: branding.tagline || null,

    /** Splash / chrome */
    logo: branding.logo || null,
    coverImage: branding.coverImage || null,

    /** Theme */
    theme: {
      primaryColor: branding.primaryColor,
      secondaryColor: branding.secondaryColor,
      accentColor: branding.accentColor,
      themeMode: branding.themeMode || 'dark',
    },

    /** App availability */
    appPublished: published,
    isDisabled: disabled,
    status: disabled ? 'DISABLED' : 'ACTIVE',

    /** What the app may show */
    features: {
      store: Boolean(features.store ?? addons.store),
      events: Boolean(features.events !== false),
      chat: Boolean(features.chat !== false),
      trainers: Boolean(features.trainers !== false),
      attendance: Boolean(features.attendance ?? addons.attendance),
      dayPass: Boolean(addons.day_pass),
      banners: Boolean(features.banners !== false && appAds.banners),
    },

    /** Ad channel toggles + creative payloads */
    ads: {
      enabled: Boolean(appAds.banners || appAds.video || appAds.audio),
      channels: {
        banners: Boolean(appAds.banners),
        video: Boolean(appAds.video),
        audio: Boolean(appAds.audio),
      },
      banners: branding.banners || [],
      videoAds: branding.videoAds || [],
      audioAds: branding.audioAds || [],
    },

    addons: {
      attendance: Boolean(addons.attendance),
      store: Boolean(addons.store),
      dayPass: Boolean(addons.day_pass),
    },

    tenant: branding.tenant || null,
  };
};
