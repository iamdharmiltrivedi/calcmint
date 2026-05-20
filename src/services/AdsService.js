import { TurboModuleRegistry } from 'react-native';
import { ADMOB } from '../constants/adsConfig';

// react-native-google-mobile-ads requires its native module to be linked into
// the binary. In Expo Go that module is missing and the library's eager imports
// crash the app at startup. We detect availability via the TurboModule registry
// and only require the JS package when the native side is actually present.
const adsAvailable = !!TurboModuleRegistry.get('RNGoogleMobileAdsModule');

let mobileAds = null;
let InterstitialAd = null;
let AdEventType = null;
let TestIds = null;
let _BannerAdSize = null;

if (adsAvailable) {
  try {
    // eslint-disable-next-line global-require
    const ads = require('react-native-google-mobile-ads');
    mobileAds = ads.default;
    InterstitialAd = ads.InterstitialAd;
    AdEventType = ads.AdEventType;
    TestIds = ads.TestIds;
    _BannerAdSize = ads.BannerAdSize;
  } catch (_) {
    // Treat any load error as "ads not available".
  }
}

export const BANNER_AD_UNIT_ID = adsAvailable && TestIds
  ? (__DEV__ ? TestIds.BANNER : ADMOB.bannerUnitId)
  : null;
export const INTERSTITIAL_AD_UNIT_ID = adsAvailable && TestIds
  ? (__DEV__ ? TestIds.INTERSTITIAL : ADMOB.interstitialUnitId)
  : null;
export const ADMOB_PUBLISHER_ID = ADMOB.publisherId;
export const BannerAdSize = _BannerAdSize;
export const isAdsAvailable = () => adsAvailable;

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
    if (!adsAvailable || !mobileAds) return;
    if (initialized) return;
    try {
      await mobileAds().initialize();
      interstitial = buildInterstitial();
      interstitial.load();
      initialized = true;
    } catch (_) {
      // SDK not linked or runtime error — fail silently so the app still runs.
      initialized = false;
    }
  },

  maybeShowInterstitial() {
    if (!adsAvailable || !initialized || !interstitial || !interstitialLoaded) return false;
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
