import mobileAds, {
  InterstitialAd,
  AdEventType,
  TestIds,
  BannerAdSize,
} from 'react-native-google-mobile-ads';

const REAL_BANNER_ID = 'ca-app-pub-7447692286150378/7573198836';
const REAL_INTERSTITIAL_ID = 'ca-app-pub-7447692286150378/2480425349';

export const BANNER_AD_UNIT_ID = __DEV__ ? TestIds.BANNER : REAL_BANNER_ID;
export const INTERSTITIAL_AD_UNIT_ID = __DEV__ ? TestIds.INTERSTITIAL : REAL_INTERSTITIAL_ID;
export { BannerAdSize };

const INTERSTITIAL_MIN_INTERVAL_MS = 3 * 60 * 1000;

let initialized = false;
let interstitial = null;
let interstitialLoaded = false;
let lastShownAt = 0;

function buildInterstitial() {
  const ad = InterstitialAd.createForAdRequest(INTERSTITIAL_AD_UNIT_ID, {
    requestNonPersonalizedAdsOnly: true,
  });

  ad.addAdEventListener(AdEventType.LOADED, () => {
    interstitialLoaded = true;
  });
  ad.addAdEventListener(AdEventType.ERROR, () => {
    interstitialLoaded = false;
  });
  ad.addAdEventListener(AdEventType.CLOSED, () => {
    interstitialLoaded = false;
    lastShownAt = Date.now();
    // Preload the next one
    try { ad.load(); } catch (_) {}
  });

  return ad;
}

const AdsService = {
  async initialize() {
    if (initialized) return;
    try {
      await mobileAds().initialize();
      interstitial = buildInterstitial();
      interstitial.load();
      initialized = true;
    } catch (_) {
      // SDK not linked (e.g., Expo Go) — fail silently so the app still runs
      initialized = false;
    }
  },

  maybeShowInterstitial() {
    if (!initialized || !interstitial || !interstitialLoaded) return false;
    if (Date.now() - lastShownAt < INTERSTITIAL_MIN_INTERVAL_MS) return false;
    try {
      interstitial.show();
      return true;
    } catch (_) {
      return false;
    }
  },
};

export default AdsService;
