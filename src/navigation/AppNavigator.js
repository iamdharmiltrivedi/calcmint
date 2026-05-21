import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../constants/colors';

// Tab screens
import DashboardScreen from '../screens/DashboardScreen';
import HomeScreen from '../screens/HomeScreen';
import ExpenseAnalysisScreen from '../screens/ExpenseAnalysisScreen';
import GoalPlannerScreen from '../screens/GoalPlannerScreen';

// Calculator screens
import HomeLoanCalculator from '../screens/calculators/HomeLoanCalculator';
import EMICalculator from '../screens/calculators/EMICalculator';
import SIPCalculator from '../screens/calculators/SIPCalculator';
import LumpsumCalculator from '../screens/calculators/LumpsumCalculator';
import FDCalculator from '../screens/calculators/FDCalculator';
import RDCalculator from '../screens/calculators/RDCalculator';
import PPFCalculator from '../screens/calculators/PPFCalculator';
import TaxSavingsCalculator from '../screens/calculators/TaxSavingsCalculator';
import GoalPlannerCalculator from '../screens/calculators/GoalPlannerCalculator';
import BudgetCalculator from '../screens/calculators/BudgetCalculator';
import RetirementCalculator from '../screens/calculators/RetirementCalculator';
import UnitConverter from '../screens/calculators/UnitConverter';

// New feature screens
import SubscriptionsScreen from '../screens/SubscriptionsScreen';
import SplitGroupsScreen from '../screens/SplitGroupsScreen';
import SplitGroupDetailScreen from '../screens/SplitGroupDetailScreen';
import SettingsScreen from '../screens/SettingsScreen';
import LockSetupScreen from '../screens/LockSetupScreen';
import BackupScreen from '../screens/BackupScreen';
import ReceiptsScreen from '../screens/ReceiptsScreen';
import ReceiptDetailScreen from '../screens/ReceiptDetailScreen';
import VaultScreen from '../screens/VaultScreen';
import VaultEntryEditScreen from '../screens/VaultEntryEditScreen';
import LoansScreen from '../screens/LoansScreen';
import LoanEditScreen from '../screens/LoanEditScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const stackOptions = {
  headerShown: false,
  contentStyle: { backgroundColor: COLORS.background },
  animation: 'slide_from_right',
  animationDuration: 220,
};

// Home (calculators) stack
const HomeStack = () => (
  <Stack.Navigator screenOptions={stackOptions}>
    <Stack.Screen name="HomeScreen" component={HomeScreen} />
    <Stack.Screen name="HomeLoanCalculator" component={HomeLoanCalculator} />
    <Stack.Screen name="EMICalculator" component={EMICalculator} />
    <Stack.Screen name="SIPCalculator" component={SIPCalculator} />
    <Stack.Screen name="LumpsumCalculator" component={LumpsumCalculator} />
    <Stack.Screen name="FDCalculator" component={FDCalculator} />
    <Stack.Screen name="RDCalculator" component={RDCalculator} />
    <Stack.Screen name="PPFCalculator" component={PPFCalculator} />
    <Stack.Screen name="TaxSavingsCalculator" component={TaxSavingsCalculator} />
    <Stack.Screen name="GoalPlannerCalculator" component={GoalPlannerCalculator} />
    <Stack.Screen name="BudgetCalculator" component={BudgetCalculator} />
    <Stack.Screen name="RetirementCalculator" component={RetirementCalculator} />
    <Stack.Screen name="UnitConverter" component={UnitConverter} />
  </Stack.Navigator>
);

// Dashboard tab only owns the dashboard screen — shared flows
// (Settings, Loans, Receipts, etc.) live in the root stack so
// each name is registered exactly once.
const DashboardStack = () => (
  <Stack.Navigator screenOptions={stackOptions}>
    <Stack.Screen name="DashboardScreen" component={DashboardScreen} />
  </Stack.Navigator>
);

// Vault tab — direct access (no PIN gate).
const VaultStack = () => (
  <Stack.Navigator screenOptions={stackOptions}>
    <Stack.Screen name="Vault" component={VaultScreen} />
    <Stack.Screen name="VaultEntryEdit" component={VaultEntryEditScreen} />
  </Stack.Navigator>
);

// More tab only owns its landing screen — shared flows live at root.
const MoreStack = () => (
  <Stack.Navigator screenOptions={stackOptions}>
    <Stack.Screen name="MoreHome" component={SettingsScreen} />
  </Stack.Navigator>
);

const TAB_ICONS = {
  Dashboard: { active: 'grid',          inactive: 'grid-outline' },
  Home:      { active: 'calculator',    inactive: 'calculator-outline' },
  Expenses:  { active: 'wallet',        inactive: 'wallet-outline' },
  Vault:     { active: 'lock-closed',   inactive: 'lock-closed-outline' },
  More:      { active: 'ellipsis-horizontal-circle', inactive: 'ellipsis-horizontal-circle-outline' },
};

const MainTabs = () => {
  const insets = useSafeAreaInsets();
  const bottomInset = insets.bottom;
  const basePadding = 6;
  const baseHeight = 60;

  return (
  <Tab.Navigator
    sceneContainerStyle={{ backgroundColor: COLORS.background }}
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarHideOnKeyboard: true,
      tabBarIcon: ({ color, size, focused }) => {
        const icons = TAB_ICONS[route.name];
        return (
          <Ionicons
            name={focused ? icons.active : icons.inactive}
            size={size}
            color={color}
          />
        );
      },
      tabBarActiveTintColor: COLORS.primary,
      tabBarInactiveTintColor: COLORS.subtext,
      tabBarStyle: {
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        paddingBottom: basePadding + bottomInset,
        paddingTop: basePadding,
        height: baseHeight + bottomInset,
      },
      tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
    })}
  >
    <Tab.Screen name="Dashboard" component={DashboardStack} />
    <Tab.Screen name="Home"      component={HomeStack}      options={{ title: 'Tools' }} />
    <Tab.Screen name="Expenses"  component={ExpenseAnalysisScreen} />
    <Tab.Screen name="Vault"     component={VaultStack} />
    <Tab.Screen name="More"      component={MoreStack} />
  </Tab.Navigator>
  );
};

// Root stack hosts the tab navigator plus all screens that need to be
// reachable from more than one tab. Registering each name once here
// avoids React Navigation's duplicate-name warning.
const RootStack = () => (
  <Stack.Navigator screenOptions={stackOptions}>
    <Stack.Screen name="MainTabs" component={MainTabs} />
    <Stack.Screen name="Settings" component={SettingsScreen} />
    <Stack.Screen name="LockSetup" component={LockSetupScreen} />
    <Stack.Screen name="Backup" component={BackupScreen} />
    <Stack.Screen name="Subscriptions" component={SubscriptionsScreen} />
    <Stack.Screen name="SplitGroups" component={SplitGroupsScreen} />
    <Stack.Screen name="SplitGroupDetail" component={SplitGroupDetailScreen} />
    <Stack.Screen name="Receipts" component={ReceiptsScreen} />
    <Stack.Screen name="ReceiptDetail" component={ReceiptDetailScreen} />
    <Stack.Screen name="Goals" component={GoalPlannerScreen} />
    <Stack.Screen name="Loans" component={LoansScreen} />
    <Stack.Screen name="LoanEdit" component={LoanEditScreen} />
  </Stack.Navigator>
);

const AppNavigator = () => (
  <NavigationContainer>
    <RootStack />
  </NavigationContainer>
);

export default AppNavigator;
