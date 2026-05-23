import React, { useEffect, useState, useCallback } from 'react';
import {
  NavigationContainer,
  getStateFromPath as rnGetStateFromPath,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../constants/colors';

import StorageService from '../services/StorageService';
import { summarizeLoan } from '../utils/loans';

// ── Tab roots ─────────────────────────────────────────────────────────
// CalcMint's calculator grid lives in HomeScreen.js. We import it as
// ToolsScreen here so the route name matches the new spec, without
// renaming the underlying file.
import DashboardScreen          from '../screens/DashboardScreen';
import ToolsScreen              from '../screens/HomeScreen';
import FinanceHomeScreen        from '../screens/FinanceHomeScreen';
import MoreScreen               from '../screens/MoreScreen';
import MarketsHomeScreen        from '../screens/markets/MarketsHomeScreen';

// ── Calculator screens ────────────────────────────────────────────────
import HomeLoanCalculator       from '../screens/calculators/HomeLoanCalculator';
import EMICalculator            from '../screens/calculators/EMICalculator';
import SIPCalculator            from '../screens/calculators/SIPCalculator';
import LumpsumCalculator        from '../screens/calculators/LumpsumCalculator';
import FDCalculator             from '../screens/calculators/FDCalculator';
import RDCalculator             from '../screens/calculators/RDCalculator';
import PPFCalculator            from '../screens/calculators/PPFCalculator';
import TaxSavingsCalculator     from '../screens/calculators/TaxSavingsCalculator';
import GoalPlannerCalculator    from '../screens/calculators/GoalPlannerCalculator';
import BudgetCalculator         from '../screens/calculators/BudgetCalculator';
import RetirementCalculator     from '../screens/calculators/RetirementCalculator';
import UnitConverter            from '../screens/calculators/UnitConverter';
import InvoiceGenerator         from '../screens/calculators/InvoiceGenerator';

// ── Finance screens ───────────────────────────────────────────────────
import ExpenseAnalysisScreen    from '../screens/ExpenseAnalysisScreen';
import LoansScreen              from '../screens/LoansScreen';
import LoanEditScreen           from '../screens/LoanEditScreen';
import SubscriptionsScreen      from '../screens/SubscriptionsScreen';
import GoalPlannerScreen        from '../screens/GoalPlannerScreen';
import SplitGroupsScreen        from '../screens/SplitGroupsScreen';
import SplitGroupDetailScreen   from '../screens/SplitGroupDetailScreen';
import AddExpenseScreen         from '../screens/AddExpenseScreen';
import AddSubscriptionScreen    from '../screens/AddSubscriptionScreen';
import AddGoalScreen            from '../screens/AddGoalScreen';

// ── Markets screens ───────────────────────────────────────────────────
import StockDetailScreen        from '../screens/markets/StockDetailScreen';
import PortfolioScreen          from '../screens/markets/PortfolioScreen';
import IPOTrackerScreen         from '../screens/markets/IPOTrackerScreen';
import NewsFeedScreen           from '../screens/markets/NewsFeedScreen';
import NewsDetailScreen         from '../screens/markets/NewsDetailScreen';
import AddEditStockScreen       from '../screens/markets/AddEditStockScreen';

// ── More-stack screens ────────────────────────────────────────────────
import VaultScreen              from '../screens/VaultScreen';
import VaultEntryEditScreen     from '../screens/VaultEntryEditScreen';
import ReceiptsScreen           from '../screens/ReceiptsScreen';
import ReceiptDetailScreen      from '../screens/ReceiptDetailScreen';
import NotificationsScreen      from '../screens/NotificationsScreen';
import AIAssistantScreen        from '../screens/AIAssistantScreen';
import CoursesScreen            from '../screens/CoursesScreen';
import CourseDetailScreen       from '../screens/CourseDetailScreen';
import LessonScreen             from '../screens/LessonScreen';
import GuidesScreen             from '../screens/GuidesScreen';
import GovtSchemesScreen        from '../screens/GovtSchemesScreen';
import BlogScreen               from '../screens/BlogScreen';
import SavingsChallengesScreen  from '../screens/SavingsChallengesScreen';
import BackupScreen             from '../screens/BackupScreen';
import LockSetupScreen          from '../screens/LockSetupScreen';
import SettingsScreen           from '../screens/SettingsScreen';
import AccountScreen            from '../screens/AccountScreen';

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

// ── Default transition presets ────────────────────────────────────────
// Stack pushes use the default "slide_from_right". Modal-style screens
// (add forms) explicitly opt into "slide_from_bottom" via per-screen
// options below.
const stackOptions = {
  headerShown: false,
  contentStyle: { backgroundColor: COLORS.background },
  animation: 'slide_from_right',
  animationDuration: 220,
};
const modalOptions = {
  presentation: 'modal',
  animation: 'slide_from_bottom',
};

// ── Tab 1 — Home ──────────────────────────────────────────────────────
const HomeTabStack = () => (
  <Stack.Navigator screenOptions={stackOptions}>
    <Stack.Screen name="DashboardScreen" component={DashboardScreen} />
    {/* Drill-ins reachable from the dashboard */}
    <Stack.Screen name="StockDetail"     component={StockDetailScreen} />
    <Stack.Screen name="NewsDetail"      component={NewsDetailScreen} />
    <Stack.Screen name="SIPCalculator"   component={SIPCalculator} />
    <Stack.Screen name="NotificationsScreen" component={NotificationsScreen} />
  </Stack.Navigator>
);

// ── Tab 2 — Markets ───────────────────────────────────────────────────
const MarketsStack = () => (
  <Stack.Navigator screenOptions={stackOptions}>
    <Stack.Screen name="MarketsHomeScreen" component={MarketsHomeScreen} />
    <Stack.Screen name="StockDetailScreen" component={StockDetailScreen} />
    <Stack.Screen name="NewsDetailScreen"  component={NewsDetailScreen} />
    <Stack.Screen name="IPOTrackerScreen"  component={IPOTrackerScreen} />
    <Stack.Screen name="PortfolioScreen"   component={PortfolioScreen} />
    <Stack.Screen name="AddHoldingScreen"  component={AddEditStockScreen} options={modalOptions} />
    <Stack.Screen name="MarketNewsScreen"  component={NewsFeedScreen} />

    {/* Aliases so existing screens that navigate without the
        "Screen" suffix keep working. */}
    <Stack.Screen name="StockDetail"   component={StockDetailScreen} />
    <Stack.Screen name="NewsDetail"    component={NewsDetailScreen} />
    <Stack.Screen name="IPOTracker"    component={IPOTrackerScreen} />
    <Stack.Screen name="Portfolio"     component={PortfolioScreen} />
    <Stack.Screen name="NewsFeed"      component={NewsFeedScreen} />
    <Stack.Screen name="AddEditStock"  component={AddEditStockScreen} options={modalOptions} />
    <Stack.Screen name="MarketsHome"   component={MarketsHomeScreen} />
  </Stack.Navigator>
);

// ── Tab 3 — Tools ─────────────────────────────────────────────────────
const ToolsTabStack = () => (
  <Stack.Navigator screenOptions={stackOptions}>
    <Stack.Screen name="ToolsScreen"           component={ToolsScreen} />
    <Stack.Screen name="HomeLoanCalculator"    component={HomeLoanCalculator} />
    <Stack.Screen name="EMICalculator"         component={EMICalculator} />
    <Stack.Screen name="SIPCalculator"         component={SIPCalculator} />
    <Stack.Screen name="LumpsumCalculator"     component={LumpsumCalculator} />
    <Stack.Screen name="FDCalculator"          component={FDCalculator} />
    <Stack.Screen name="RDCalculator"          component={RDCalculator} />
    <Stack.Screen name="PPFCalculator"         component={PPFCalculator} />
    <Stack.Screen name="TaxSavingsCalculator"  component={TaxSavingsCalculator} />
    <Stack.Screen name="GoalPlannerCalculator" component={GoalPlannerCalculator} />
    <Stack.Screen name="BudgetCalculator"      component={BudgetCalculator} />
    <Stack.Screen name="RetirementCalculator"  component={RetirementCalculator} />
    <Stack.Screen name="UnitConverter"         component={UnitConverter} />
    <Stack.Screen name="InvoiceGenerator"      component={InvoiceGenerator} />

    {/* Alias for legacy HomeScreen route (used by some links). */}
    <Stack.Screen name="HomeScreen"            component={ToolsScreen} />
  </Stack.Navigator>
);

// ── Tab 4 — Finance ───────────────────────────────────────────────────
const FinanceTabStack = () => (
  <Stack.Navigator screenOptions={stackOptions}>
    <Stack.Screen name="FinanceHome"        component={FinanceHomeScreen} />
    <Stack.Screen name="Expenses"           component={ExpenseAnalysisScreen} />
    <Stack.Screen name="Loans"              component={LoansScreen} />
    <Stack.Screen name="Subscriptions"      component={SubscriptionsScreen} />
    <Stack.Screen name="Goals"              component={GoalPlannerScreen} />
    <Stack.Screen name="SplitGroups"        component={SplitGroupsScreen} />
    <Stack.Screen name="SplitGroupDetail"   component={SplitGroupDetailScreen} />

    {/* Add forms — slide_from_bottom, full-height modal */}
    <Stack.Screen name="AddExpense"         component={AddExpenseScreen}      options={modalOptions} />
    <Stack.Screen name="AddLoan"            component={LoanEditScreen}        options={modalOptions} />
    <Stack.Screen name="AddSubscription"    component={AddSubscriptionScreen} options={modalOptions} />
    <Stack.Screen name="AddGoal"            component={AddGoalScreen}         options={modalOptions} />

    {/* Aliases for existing routes that still target these names. */}
    <Stack.Screen name="LoanEdit"           component={LoanEditScreen}        options={modalOptions} />
    <Stack.Screen name="ExpenseAnalysis"    component={ExpenseAnalysisScreen} />
  </Stack.Navigator>
);

// ── Tab 5 — More ──────────────────────────────────────────────────────
const MoreTabStack = () => (
  <Stack.Navigator screenOptions={stackOptions}>
    <Stack.Screen name="MoreHome"             component={MoreScreen} />
    <Stack.Screen name="Vault"                component={VaultScreen} />
    <Stack.Screen name="VaultEntryEdit"       component={VaultEntryEditScreen} options={modalOptions} />
    <Stack.Screen name="Receipts"             component={ReceiptsScreen} />
    <Stack.Screen name="ReceiptDetail"        component={ReceiptDetailScreen} />
    <Stack.Screen name="AIAssistant"          component={AIAssistantScreen} />
    <Stack.Screen name="Courses"              component={CoursesScreen} />
    <Stack.Screen name="CourseDetail"         component={CourseDetailScreen} />
    <Stack.Screen name="Lesson"               component={LessonScreen} />
    <Stack.Screen name="Guides"               component={GuidesScreen} />
    <Stack.Screen name="GovtSchemes"          component={GovtSchemesScreen} />
    <Stack.Screen name="Blog"                 component={BlogScreen} />
    <Stack.Screen name="SavingsChallenges"    component={SavingsChallengesScreen} />
    <Stack.Screen name="BackupRestore"        component={BackupScreen} />
    <Stack.Screen name="LockSetup"            component={LockSetupScreen} />
    <Stack.Screen name="Settings"             component={SettingsScreen} />
    <Stack.Screen name="Account"              component={AccountScreen} />
    <Stack.Screen name="Notifications"        component={NotificationsScreen} />
  </Stack.Navigator>
);

// ── Tab icon map (MaterialCommunityIcons) ────────────────────────────
// Spec asked for: layout-dashboard, chart-candle, calculator, wallet,
// dots-circle-horizontal. MCI doesn't ship a candlestick icon, so the
// Markets tab uses `chart-line` — the closest valid market-chart glyph.
const TAB_ICONS = {
  Home:    'view-dashboard',
  Markets: 'chart-line',
  Tools:   'calculator-variant',
  Finance: 'wallet',
  More:    'dots-horizontal-circle',
};

// Compute Finance tab badge: count overdue loans + subs. We poll on
// focus rather than subscribe — the data lives in AsyncStorage, so a
// timer + focus listener keeps the count current without a context.
function useOverdueCount() {
  const [count, setCount] = useState(0);
  const recount = useCallback(async () => {
    try {
      const [loans, subs] = await Promise.all([
        StorageService.getLoans(),
        StorageService.getSubscriptions(),
      ]);
      const today = new Date(); today.setHours(0, 0, 0, 0);
      let n = 0;
      for (const l of loans || []) {
        const s = summarizeLoan(l);
        if (!s.isClosed && s.daysLeft != null && s.daysLeft <= 0) n += 1;
      }
      for (const sub of subs || []) {
        if (!sub.nextRenewal) continue;
        const d = new Date(sub.nextRenewal); d.setHours(0, 0, 0, 0);
        if (d <= today) n += 1;
      }
      setCount(n);
    } catch {
      setCount(0);
    }
  }, []);
  useEffect(() => {
    recount();
    // refresh every 5 min while the app is open
    const id = setInterval(recount, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [recount]);
  return { count, recount };
}

const MainTabs = () => {
  const insets = useSafeAreaInsets();
  const { count: overdue, recount } = useOverdueCount();

  return (
    <Tab.Navigator
      sceneContainerStyle={{ backgroundColor: COLORS.background }}
      screenListeners={{
        // Recount when the user lands on Finance — covers the case
        // where an Add* modal added something while the tab was active.
        state: () => recount(),
      }}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarHideOnKeyboard: true,
        // Native tabs feel — no slide animation between tabs.
        animationEnabled: false,
        tabBarIcon: ({ color, size }) => (
          <MaterialCommunityIcons
            name={TAB_ICONS[route.name]}
            size={size + 1}
            color={color}
          />
        ),
        tabBarActiveTintColor:   COLORS.primary,
        tabBarInactiveTintColor: COLORS.subtext,
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 0.5,
          borderTopColor: COLORS.hairline,
          paddingBottom: 6 + insets.bottom,
          paddingTop: 6,
          height: 60 + insets.bottom,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
        tabBarBadgeStyle: {
          backgroundColor: COLORS.negative,
          color: '#fff',
          fontSize: 10,
          fontWeight: '800',
          minWidth: 16, height: 16, lineHeight: 16,
        },
      })}
    >
      <Tab.Screen name="Home"    component={HomeTabStack} />
      <Tab.Screen name="Markets" component={MarketsStack} />
      <Tab.Screen name="Tools"   component={ToolsTabStack} />
      <Tab.Screen
        name="Finance"
        component={FinanceTabStack}
        options={overdue > 0 ? { tabBarBadge: overdue > 9 ? '9+' : String(overdue) } : {}}
      />
      <Tab.Screen name="More"    component={MoreTabStack} />
    </Tab.Navigator>
  );
};

// ── Deep linking ──────────────────────────────────────────────────────
// Supported schemes:
//   calcmint://stock/:symbol            → Markets > StockDetail
//   calcmint://calculator/:id           → Tools > <calculator> (id matches
//                                          CALCULATORS[i].screen lowercased
//                                          shortname: sip, emi, fd, rd,
//                                          ppf, tax, lumpsum, home, goal,
//                                          budget, retire, invoice, units)
//   calcmint://alert/:symbol            → Markets > StockDetail (treated
//                                          like a price-alert tap)
//   calcmint://notifications            → Home > Notifications
//   calcmint://ipo                      → Markets > IPOTracker
const linking = {
  prefixes: ['calcmint://'],
  config: {
    screens: {
      MainTabs: {
        screens: {
          Home: {
            screens: {
              DashboardScreen: '',
              NotificationsScreen: 'notifications',
            },
          },
          Markets: {
            screens: {
              MarketsHomeScreen: 'markets',
              StockDetailScreen: {
                path: 'stock/:symbol',
                parse: { symbol: (s) => decodeURIComponent(s).toUpperCase() },
              },
              IPOTrackerScreen: 'ipo',
            },
          },
          Tools: {
            screens: {
              ToolsScreen:           'calculator',
              SIPCalculator:         'calculator/sip',
              EMICalculator:         'calculator/emi',
              FDCalculator:          'calculator/fd',
              RDCalculator:          'calculator/rd',
              PPFCalculator:         'calculator/ppf',
              TaxSavingsCalculator:  'calculator/tax',
              LumpsumCalculator:     'calculator/lumpsum',
              HomeLoanCalculator:    'calculator/home',
              GoalPlannerCalculator: 'calculator/goal',
              BudgetCalculator:      'calculator/budget',
              RetirementCalculator:  'calculator/retire',
              UnitConverter:         'calculator/units',
              InvoiceGenerator:      'calculator/invoice',
            },
          },
          Finance: {
            screens: {
              FinanceHome: 'finance',
              AddExpense:  'finance/add',
            },
          },
          More: {
            screens: {
              MoreHome:     'more',
              AIAssistant:  'ask',
            },
          },
        },
      },
    },
  },
};

// React Navigation only takes one path per screen, so we register the
// canonical `stock/:symbol` above and rewrite `alert/:symbol` into it
// via a custom getStateFromPath. A price-alert tap that fires
// calcmint://alert/HDFCBANK lands on the same StockDetail screen.
const getStateFromPath = (path, options) => {
  const rewritten = path.replace(/^\/?alert\//, 'stock/');
  return rnGetStateFromPath(rewritten, options);
};

const AppNavigator = () => (
  <NavigationContainer linking={{ ...linking, getStateFromPath }} fallback={null}>
    <MainTabs />
  </NavigationContainer>
);

export default AppNavigator;
