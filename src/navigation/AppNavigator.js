import React from 'react';
import { Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';

// Tab screens
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

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Stack navigator for the Home tab — contains all calculator screens
const HomeStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: COLORS.background } }}>
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
  </Stack.Navigator>
);

const TAB_ICONS = {
  Home:     { active: 'home',         inactive: 'home-outline' },
  Expenses: { active: 'wallet',       inactive: 'wallet-outline' },
  Goals:    { active: 'flag',         inactive: 'flag-outline' },
};

const AppNavigator = () => (
  <NavigationContainer>
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
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeStack} />
      <Tab.Screen name="Expenses" component={ExpenseAnalysisScreen} />
      <Tab.Screen name="Goals" component={GoalPlannerScreen} />
    </Tab.Navigator>
  </NavigationContainer>
);

export default AppNavigator;
