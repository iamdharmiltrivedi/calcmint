// Must be first import for gesture handler to work correctly
import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider } from './src/context/AppContext';
import AppNavigator from './src/navigation/AppNavigator';
import { COLORS } from './src/constants/colors';
import AdsService from './src/services/AdsService';

export default function App() {
  useEffect(() => {
    AdsService.initialize();
  }, []);

  return (
    <SafeAreaProvider>
      <AppProvider>
        <StatusBar style="light" backgroundColor={COLORS.primary} />
        <AppNavigator />
      </AppProvider>
    </SafeAreaProvider>
  );
}
