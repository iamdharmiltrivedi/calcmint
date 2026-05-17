import React from 'react';
import { Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { useLock } from '../context/LockContext';

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
import LockScreen from '../screens/LockScreen';
import BackupScreen from '../screens/BackupScreen';
import ReceiptsScreen from '../screens/ReceiptsScreen';
import ReceiptDetailScreen from '../screens/ReceiptDetailScreen';
import VaultScreen from '../screens/VaultScreen';
import VaultUnlockScreen from '../screens/VaultUnlockScreen';
import VaultEntryEditScreen from '../screens/VaultEntryEditScreen';
import LoansScreen from '../screens/LoansScreen';
import LoanEditScreen from '../screens/LoanEditScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const stackOptions = { headerShown: false, contentStyle: { backgroundColor: COLORS.background } };

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

// Dashboard stack hosts dashboard-launched flows
const DashboardStack = () => (
  <Stack.Navigator screenOptions={stackOptions}>
    <Stack.Screen name="DashboardScreen" component={DashboardScreen} />
    <Stack.Screen name="Settings" component={SettingsScreen} />
    <Stack.Screen name="LockSetup" component={LockSetupScreen} />
    <Stack.Screen name="Backup" component={BackupScreen} />
    <Stack.Screen name="Subscriptions" component={SubscriptionsScreen} />
    <Stack.Screen name="SplitGroups" component={SplitGroupsScreen} />
    <Stack.Screen name="SplitGroupDetail" component={SplitGroupDetailScreen} />
    <Stack.Screen name="Receipts" component={ReceiptsScreen} />
    <Stack.Screen name="ReceiptDetail" component={ReceiptDetailScreen} />
    <Stack.Screen name="VaultUnlock" component={VaultUnlockScreen} options={{ presentation: 'modal' }} />
    <Stack.Screen name="Vault" component={VaultScreen} />
    <Stack.Screen name="VaultEntryEdit" component={VaultEntryEditScreen} />
    <Stack.Screen name="Loans" component={LoansScreen} />
    <Stack.Screen name="LoanEdit" component={LoanEditScreen} />
  </Stack.Navigator>
);

const MoreStack = () => (
  <Stack.Navigator screenOptions={stackOptions}>
    <Stack.Screen name="MoreHome" component={SettingsScreen} />
    <Stack.Screen name="Subscriptions" component={SubscriptionsScreen} />
    <Stack.Screen name="SplitGroups" component={SplitGroupsScreen} />
    <Stack.Screen name="SplitGroupDetail" component={SplitGroupDetailScreen} />
    <Stack.Screen name="Receipts" component={ReceiptsScreen} />
    <Stack.Screen name="ReceiptDetail" component={ReceiptDetailScreen} />
    <Stack.Screen name="LockSetup" component={LockSetupScreen} />
    <Stack.Screen name="Backup" component={BackupScreen} />
    <Stack.Screen name="VaultUnlock" component={VaultUnlockScreen} options={{ presentation: 'modal' }} />
    <Stack.Screen name="Vault" component={VaultScreen} />
    <Stack.Screen name="VaultEntryEdit" component={VaultEntryEditScreen} />
    <Stack.Screen name="Loans" component={LoansScreen} />
    <Stack.Screen name="LoanEdit" component={LoanEditScreen} />
  </Stack.Navigator>
);

const TAB_ICONS = {
  Dashboard: { active: 'grid',          inactive: 'grid-outline' },
  Home:      { active: 'calculator',    inactive: 'calculator-outline' },
  Expenses:  { active: 'wallet',        inactive: 'wallet-outline' },
  Goals:     { active: 'flag',          inactive: 'flag-outline' },
  More:      { active: 'ellipsis-horizontal-circle', inactive: 'ellipsis-horizontal-circle-outline' },
};

const MainTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
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
        paddingBottom: Platform.OS === 'ios' ? 20 : 6,
        paddingTop: 6,
        height: Platform.OS === 'ios' ? 82 : 60,
      },
      tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
    })}
  >
    <Tab.Screen name="Dashboard" component={DashboardStack} />
    <Tab.Screen name="Home"      component={HomeStack}      options={{ title: 'Tools' }} />
    <Tab.Screen name="Expenses"  component={ExpenseAnalysisScreen} />
    <Tab.Screen name="Goals"     component={GoalPlannerScreen} />
    <Tab.Screen name="More"      component={MoreStack} />
  </Tab.Navigator>
);

const AppNavigator = () => {
  const { lockEnabled, isUnlocked, hydrated } = useLock();
  if (!hydrated) return null;
  return (
    <NavigationContainer>
      {lockEnabled && !isUnlocked ? <LockScreen /> : <MainTabs />}
    </NavigationContainer>
  );
};

export default AppNavigator;
