// Must be first import for gesture handler to work correctly
import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider } from './src/context/AppContext';
import { LockProvider } from './src/context/LockContext';
import { VaultUnlockProvider } from './src/context/VaultUnlockContext';
import AppNavigator from './src/navigation/AppNavigator';
import { COLORS } from './src/constants/colors';
import AdsService from './src/services/AdsService';
import { usePortfolioStore } from './src/store/portfolioStore';
import { useMarketStore } from './src/store/marketStore';

export default function App() {
  useEffect(() => {
    AdsService.initialize();
    // Hydrate Markets stores from AsyncStorage. Zustand has no provider
    // — these are global singletons, so we kick the loads early so the
    // dashboard portfolio strip and watchlist render without flicker.
    usePortfolioStore.getState().load().catch(() => {});
    useMarketStore.getState().init().catch(() => {});
    useMarketStore.getState().loadCachedNews().catch(() => {});
  }, []);

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
