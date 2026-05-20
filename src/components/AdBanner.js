import React, { useState } from 'react';
import { View, StyleSheet, TurboModuleRegistry } from 'react-native';
import { BANNER_AD_UNIT_ID, isAdsAvailable } from '../services/AdsService';

// Only require the native package when its module is registered. In Expo Go
// it's missing — without this guard, the eager import crashes the whole app.
let BannerAd = null;
let BannerAdSize = null;
if (TurboModuleRegistry.get('RNGoogleMobileAdsModule')) {
  try {
    // eslint-disable-next-line global-require
    const ads = require('react-native-google-mobile-ads');
    BannerAd = ads.BannerAd;
    BannerAdSize = ads.BannerAdSize;
  } catch (_) { /* ads silently disabled */ }
}

export default function AdBanner({ style }) {
  const [failed, setFailed] = useState(false);
  if (!isAdsAvailable() || !BannerAd || !BannerAdSize || !BANNER_AD_UNIT_ID || failed) {
    return null;
  }

  return (
    <View style={[styles.wrap, style]}>
      <BannerAd
        unitId={BANNER_AD_UNIT_ID}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: true }}
        onAdFailedToLoad={() => setFailed(true)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
});
