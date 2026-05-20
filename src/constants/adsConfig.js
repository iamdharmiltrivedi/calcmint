// Single source of truth for Google AdMob configuration.
// Update IDs here — everything else (AdsService, AdBanner, future ad slots)
// reads from this module.
//
// SDK: react-native-google-mobile-ads ^15.0.0
//
// NOTE: The native plugin in app.json still needs the per-platform AdMob
// App IDs (the `~`-separated ones from the AdMob console — distinct from
// the unit IDs below). Fill `androidAppId` / `iosAppId` in app.json once
// you have them; otherwise the SDK initializes against Google's sample
// test app and your real account won't be credited for impressions.
export const ADMOB = {
  publisherId: 'ca-app-pub-7447692286150378',
  bannerUnitId: 'ca-app-pub-7447692286150378/7573198836',
  interstitialUnitId: 'ca-app-pub-7447692286150378/2480425349',
};

export default ADMOB;
