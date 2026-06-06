// Must be first import for gesture handler to work correctly
import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { AppProvider } from './src/context/AppContext';
import { LockProvider } from './src/context/LockContext';
import { VaultUnlockProvider } from './src/context/VaultUnlockContext';
import AppNavigator from './src/navigation/AppNavigator';
import { COLORS } from './src/constants/colors';
import { FONT_ASSETS } from './src/theme/fonts';
import { setupDefaultFont } from './src/theme/setupDefaultFont';
import AdsService from './src/services/AdsService';
import { usePortfolioStore } from './src/store/portfolioStore';
import { useMarketStore } from './src/store/marketStore';

export default function App() {
  // Load Inter (all four weights) before any UI renders so we never see
  // a FOUT or layout shift. FONT_ASSETS is a lazy require so non-app
  // entry points (Jest, snapshot tooling) don't have to resolve binary
  // .ttf modules.
  const [fontsLoaded] = useFonts(FONT_ASSETS());

  useEffect(() => {
    if (fontsLoaded) setupDefaultFont();
  }, [fontsLoaded]);

  useEffect(() => {
    AdsService.initialize();
    // Hydrate Markets stores from AsyncStorage. Zustand has no provider
    // — these are global singletons, so we kick the loads early so the
    // dashboard portfolio strip and watchlist render without flicker.
    usePortfolioStore.getState().load().catch(() => {});
    useMarketStore.getState().init().catch(() => {});
    useMarketStore.getState().loadCachedNews().catch(() => {});
  }, []);

  if (!fontsLoaded) {
    // Render a plain background while fonts load. The native splash
    // screen still owns the first frame; this fills the gap from splash
    // dismissal to first nav frame.
    return <View style={{ flex: 1, backgroundColor: COLORS.background }} />;
  }

  return (
    <SafeAreaProvider>
      <LockProvider>
        <VaultUnlockProvider>
          <AppProvider>
            <StatusBar style="light" backgroundColor={COLORS.primary} />
            <AppNavigator />
          </AppProvider>
        </VaultUnlockProvider>
      </LockProvider>
    </SafeAreaProvider>
  );
}
