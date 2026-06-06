// Font identity for the app: Inter, four weights.
//
// Indian-fintech reference apps (INDmoney, Groww, Upstox, Zerodha, Angel
// One) ship a single sans-serif family across UI and numeric values —
// numbers get prominence through weight (SemiBold / Bold) and size, not
// a contrasting monospace face. We follow that pattern.
//
// The string names below MUST match the keys passed to `useFonts(...)`
// in App.js. Centralising the keys here means rename-in-one-place
// cascades through every component, token, and stylesheet.

export const FONT_FAMILIES = {
  interRegular:  'Inter_400Regular',
  interMedium:   'Inter_500Medium',
  interSemiBold: 'Inter_600SemiBold',
  interBold:     'Inter_700Bold',
};

// Asset map handed to useFonts(). Lazy-required so non-app entry points
// (Jest, snapshot tooling) don't have to resolve binary .ttf modules.
export const FONT_ASSETS = () => {
  const inter = require('@expo-google-fonts/inter');
  return {
    Inter_400Regular:  inter.Inter_400Regular,
    Inter_500Medium:   inter.Inter_500Medium,
    Inter_600SemiBold: inter.Inter_600SemiBold,
    Inter_700Bold:     inter.Inter_700Bold,
  };
};
