import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator,
  TextInput, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, MONO_STYLE } from '../constants/colors';
import StorageService from '../services/StorageService';
import { formatINR, formatINRFull } from '../utils/formatters';
import { summarizeLoan, totalMonthlyObligation } from '../utils/loans';
import { useApp } from '../context/AppContext';
import { EXPENSE_CATEGORIES } from '../constants/categories';

import { usePortfolioStore } from '../store/portfolioStore';
import { useMarketStore } from '../store/marketStore';
import { getActiveIPOs } from '../services/markets/IPOService';
import AIService from '../services/AIService';

import BottomSheet from '../components/ui/BottomSheet';
import EmptyState from '../components/ui/EmptyState';
import BrandHeader from '../components/BrandHeader';

const inMonth = (iso, monthOffset = 0) => {
  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const d = new Date(iso);
  return d.getFullYear() === target.getFullYear() && d.getMonth() === target.getMonth();
};
const sum = (arr, sel) => arr.reduce((s, x) => s + (sel ? sel(x) : x), 0);
const CYCLE_MONTHS = { monthly: 1, quarterly: 3, yearly: 12 };
const monthlyOfSub = (s) => s.amount / (CYCLE_MONTHS[s.cycle] || 1);

const today = () => new Date().toISOString().split('T')[0];
const friendlyToday = () => new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

export default function DashboardScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { expenses, goals, addExpense } = useApp();
  const [subs, setSubs] = useState([]);
  const [loans, setLoans] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [activeIPOs, setActiveIPOs] = useState([]);
  const [insight, setInsight] = useState(null);
  const [insightLoading, setInsightLoading] = useState(false);
  // Dismissible state survives only this session — the 6h cache lives
  // inside AIService, so a fresh nudge auto-appears tomorrow.
  const [nudgeDismissed, setNudgeDismissed] = useState(false);

  // Quick-add bottom sheets
  const [expenseSheet, setExpenseSheet] = useState(false);
  const [watchSheet,   setWatchSheet]   = useState(false);
  const [expForm, setExpForm] = useState({ amount: '', categoryId: 'food', note: '' });
  const [watchForm, setWatchForm] = useState({ name: '', symbol: '', type: 'Stock' });

  // Markets data
  const portfolioHoldings = usePortfolioStore((s) => s.holdings);
  const loadPortfolio     = usePortfolioStore((s) => s.load);
  const portfolioSummary  = usePortfolioStore((s) => s.getSummary());
  const allMetrics        = usePortfolioStore((s) => s.getAllWithMetrics());
  const watchlist         = useMarketStore((s) => s.watchlist);
  const initMarket        = useMarketStore((s) => s.init);
  const refreshPrices     = useMarketStore((s) => s.refreshAllPrices);
  const addWatch          = useMarketStore((s) => s.addWatch);

  const load = useCallback(async () => {
    const [s, l] = await Promise.all([
      StorageService.getSubscriptions(),
      StorageService.getLoans(),
    ]);
    setSubs(s);
    setLoans(l);
  }, []);

  useEffect(() => {
    load();
    loadPortfolio();
    initMarket();
    getActiveIPOs().then(setActiveIPOs).catch(() => {});
  }, [load, loadPortfolio, initMarket]);

  useEffect(() => {
    const focus = navigation.addListener('focus', () => {
      load();
      loadPortfolio();
    });
    return focus;
  }, [navigation, load, loadPortfolio]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      load(),
      refreshPrices(portfolioHoldings),
      getActiveIPOs({ force: true }).then(setActiveIPOs).catch(() => {}),
    ]);
    setRefreshing(false);
  };

  const monthSpend     = useMemo(() => sum(expenses.filter((e) => inMonth(e.date || e.createdAt, 0)),  (e) => e.amount), [expenses]);
  const lastMonthSpend = useMemo(() => sum(expenses.filter((e) => inMonth(e.date || e.createdAt, -1)), (e) => e.amount), [expenses]);
  const monthSubs      = useMemo(() => sum(subs, monthlyOfSub), [subs]);
  const delta = lastMonthSpend > 0 ? ((monthSpend - lastMonthSpend) / lastMonthSpend) * 100 : null;
  const monthlyEMI = useMemo(() => totalMonthlyObligation(loans), [loans]);

  // Surplus = est. income − spend − EMI
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  useEffect(() => {
    StorageService.getSettings().then((s) => {
      if (s && Number(s.monthlyIncome) > 0) setMonthlyIncome(Number(s.monthlyIncome));
    });
  }, []);
  const estimatedIncome = monthlyIncome > 0 ? monthlyIncome : Math.max(monthSpend, lastMonthSpend) * 1.5;
  const surplus = Math.max(0, estimatedIncome - monthSpend - monthlyEMI);

  const goalProgress = useMemo(() => {
    if (goals.length === 0) return null;
    const total = sum(goals, (g) => g.target || g.targetAmount || 0);
    const saved = sum(goals, (g) => g.saved || 0);
    return { total, saved, pct: total > 0 ? (saved / total) * 100 : 0, count: goals.length };
  }, [goals]);

  const watchMovers = useMemo(() => allMetrics
    .slice()
    .sort((a, b) => Math.abs(b.profitLossPercent) - Math.abs(a.profitLossPercent))
    .slice(0, 3), [allMetrics]);

  const upcomingEMIs = useMemo(() => loans
    .map((l) => ({ loan: l, s: summarizeLoan(l) }))
    .filter((x) => !x.s.isClosed && x.s.daysLeft != null)
    .sort((a, b) => a.s.daysLeft - b.s.daysLeft)
    .slice(0, 3), [loans]);

  const upcomingSubs = useMemo(() => [...subs]
    .filter((s) => s.nextRenewal)
    .sort((a, b) => new Date(a.nextRenewal) - new Date(b.nextRenewal))
    .slice(0, 3), [subs]);

  const askInsight = useCallback(async (force = false) => {
    setInsightLoading(true);
    try {
      if (force) await AIService.clearNudgeCache();
      const tip = await AIService.getDailyDashboardNudge(
        { monthSpend, monthlyEMI, monthSubs },
        null, // monthBudget — wire to settings when we add it
        {
          value: portfolioSummary.totalCurrent,
          pl:    portfolioSummary.totalProfitLoss,
          pct:   portfolioSummary.totalProfitLossPercent,
        },
      );
      setInsight(tip);
      setNudgeDismissed(false);
    } finally {
      setInsightLoading(false);
    }
  }, [monthSpend, monthlyEMI, monthSubs, portfolioSummary]);

  useEffect(() => {
    if (insight) return;
    if (expenses.length === 0 && portfolioHoldings.length === 0) return;
    askInsight();
  }, [insight, expenses.length, portfolioHoldings.length, askInsight]);

  const portfolioPositive = portfolioSummary.totalProfitLoss >= 0;

  // ── Quick-add submit handlers ─────────────────────────────────────────
  const submitExpense = async () => {
    const amt = parseFloat(expForm.amount);
    if (!amt || amt <= 0) return Alert.alert('Enter an amount');
    await addExpense({
      amount: amt, categoryId: expForm.categoryId,
      note: expForm.note.trim(), date: today(),
    });
    setExpForm({ amount: '', categoryId: 'food', note: '' });
    setExpenseSheet(false);
  };

  const submitWatch = async () => {
    if (!watchForm.symbol.trim() || !watchForm.name.trim()) return Alert.alert('Name and symbol are required');
    await addWatch({
      name: watchForm.name.trim(),
      symbol: watchForm.symbol.trim().toUpperCase(),
      type: watchForm.type,
    });
    setWatchForm({ name: '', symbol: '', type: 'Stock' });
    setWatchSheet(false);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Shared brand header — same logo + name on every tab root. */}
      <BrandHeader
        rightActions={[
          { icon: 'notifications-outline', label: 'Notifications', onPress: () => navigation.navigate('NotificationsScreen') },
        ]}
      />

      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: 32 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        {/* ── ABOVE-FOLD: three things only ─────────────────────────── */}
        <Text style={styles.greeting}>{greeting()}</Text>

        {/* 2-column metric grid */}
        <View style={styles.metricRow}>
          <View style={[styles.metricCard, { borderTopColor: COLORS.primary, borderTopWidth: 3 }]}>
            <Text style={styles.metricLabel}>SPENT THIS MONTH</Text>
            <Text style={styles.metricValue}>{formatINRFull(monthSpend)}</Text>
            {delta !== null && (
              <Text style={[styles.metricDelta, { color: delta >= 0 ? COLORS.negative : COLORS.positive }]}>
                {delta >= 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(0)}% vs last month
              </Text>
            )}
          </View>
          <View
            style={[
              styles.metricCard,
              {
                borderTopColor: portfolioHoldings.length === 0
                  ? COLORS.subtext
                  : portfolioPositive ? COLORS.positive : COLORS.negative,
                borderTopWidth: 3,
              },
            ]}
            onTouchEnd={() => portfolioHoldings.length > 0 && navigation.getParent()?.navigate('Markets', { screen: 'Portfolio' })}
          >
            <Text style={styles.metricLabel}>PORTFOLIO</Text>
            {portfolioHoldings.length === 0 ? (
              <>
                <Text style={[styles.metricValue, { color: COLORS.subtext }]}>—</Text>
                <Text style={styles.metricDelta}>No holdings yet</Text>
              </>
            ) : (
              <>
                <Text style={styles.metricValue}>{formatINRFull(portfolioSummary.totalCurrent)}</Text>
                <Text style={[styles.metricDelta, { color: portfolioPositive ? COLORS.positive : COLORS.negative }]}>
                  {portfolioPositive ? '▲' : '▼'} {Math.abs(portfolioSummary.totalProfitLossPercent).toFixed(2)}%
                </Text>
              </>
            )}
          </View>
        </View>

        {/* AI nudge — dismissible green card, refreshes every 6h via AIService */}
        {!nudgeDismissed && (
          <View style={styles.nudgeCard}>
            <View style={styles.nudgeOrb}>
              <Ionicons name="sparkles" size={13} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.nudgeLabel}>AI INSIGHT</Text>
              {insightLoading ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={styles.nudgeSub}>Thinking…</Text>
                </View>
              ) : (
                <Text style={styles.nudgeText}>{insight || 'Add data or pull to refresh for a personalised tip.'}</Text>
              )}
            </View>
            {!insightLoading && (
              <TouchableOpacity
                onPress={() => askInsight(true)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={{ marginRight: 4 }}
              >
                <Ionicons name="refresh" size={14} color="rgba(255,255,255,0.85)" />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => setNudgeDismissed(true)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={14} color="rgba(255,255,255,0.85)" />
            </TouchableOpacity>
          </View>
        )}

        {/* ── BELOW FOLD ──────────────────────────────────────────── */}

        {/* Horizontal scroll quick actions */}
        <Text style={styles.sectionLabel}>Quick actions</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickScroll}
        >
          <QuickChip icon="add-circle" label="Add expense"    onPress={() => setExpenseSheet(true)}        color={COLORS.primary} />
          <QuickChip icon="trending-up" label="Analyse stock" onPress={() => navigation.getParent()?.navigate('Markets', { screen: 'MarketsHome' })} color="#2E5BFF" />
          <QuickChip icon="calculator-outline" label="Calculate" onPress={() => navigation.getParent()?.navigate('Tools')} color="#6F4FE0" />
          <QuickChip icon="star" label="Add to watchlist"     onPress={() => setWatchSheet(true)}          color={COLORS.gold} />
          <QuickChip icon="podium-outline" label="IPOs"        onPress={() => navigation.getParent()?.navigate('Markets', { screen: 'IPOTracker' })} color="#218A52" />
        </ScrollView>

        {/* Active IPO banner */}
        {activeIPOs.length > 0 && (
          <TouchableOpacity
            style={styles.ipoBanner}
            activeOpacity={0.9}
            onPress={() => navigation.getParent()?.navigate('Markets', { screen: 'IPOTracker' })}
          >
            <View style={styles.ipoIcon}>
              <Ionicons name="podium-outline" size={18} color={COLORS.gold} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.ipoTitle}>{activeIPOs.length} IPO{activeIPOs.length > 1 ? 's' : ''} open now</Text>
              <Text style={styles.ipoSub} numberOfLines={1}>
                {activeIPOs.slice(0, 2).map((i) => i.name).join(' · ')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.subtext} />
          </TouchableOpacity>
        )}

        {/* Surplus card */}
        {surplus > 0 && (
          <View style={styles.surplusCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.surplusLabel}>AVAILABLE TO INVEST</Text>
              <Text style={styles.surplusValue}>{formatINR(surplus)} / mo</Text>
              <Text style={styles.surplusMeta}>= income − spend − EMIs</Text>
            </View>
            <TouchableOpacity
              style={styles.surplusBtn}
              onPress={() => navigation.getParent()?.navigate('Tools', {
                screen: 'SIPCalculator',
                params: { prefillAmount: Math.round(surplus) },
              })}
            >
              <Text style={styles.surplusBtnText}>Start SIP</Text>
              <Ionicons name="arrow-forward" size={13} color="#fff" />
            </TouchableOpacity>
          </View>
        )}

        {/* Top movers */}
        {watchMovers.length > 0 && (
          <Section title="Top movers" onMore={() => navigation.getParent()?.navigate('Markets', { screen: 'Portfolio' })}>
            {watchMovers.map((m) => {
              const positive = m.profitLoss >= 0;
              const color = positive ? COLORS.positive : COLORS.negative;
              return (
                <TouchableOpacity
                  key={m.holding.id}
                  style={styles.listRow}
                  activeOpacity={0.85}
                  onPress={() => navigation.getParent()?.navigate('Markets', { screen: 'StockDetail', params: { holdingId: m.holding.id } })}
                >
                  <View style={[styles.listIcon, { backgroundColor: m.holding.type === 'MF' ? COLORS.goldSoft : COLORS.primarySoft }]}>
                    <Ionicons name={m.holding.type === 'MF' ? 'pie-chart-outline' : 'stats-chart-outline'} size={15} color={m.holding.type === 'MF' ? COLORS.gold : COLORS.primary} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.listTitle} numberOfLines={1}>{m.holding.symbol}</Text>
                    <Text style={styles.listMeta} numberOfLines={1}>{m.holding.name}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.listAmount}>{formatINR(m.currentValue)}</Text>
                    <Text style={[styles.listPct, { color }]}>
                      {positive ? '+' : ''}{m.profitLossPercent.toFixed(2)}%
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </Section>
        )}

        {/* Goals */}
        {goalProgress && (
          <Section title="Goals" onMore={() => navigation.getParent()?.navigate('Finance', { screen: 'Goals' })}>
            <View style={styles.goalSummary}>
              <Text style={styles.goalLabel}>Across {goalProgress.count} goal{goalProgress.count > 1 ? 's' : ''}</Text>
              <Text style={styles.goalValue}>
                {formatINRFull(goalProgress.saved)} <Text style={styles.goalSub}>of {formatINR(goalProgress.total)}</Text>
              </Text>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${Math.min(100, goalProgress.pct)}%` }]} />
              </View>
              <Text style={styles.goalPct}>{goalProgress.pct.toFixed(0)}% reached</Text>
            </View>
          </Section>
        )}

        {/* Upcoming EMIs */}
        {upcomingEMIs.length > 0 && (
          <Section title="Upcoming EMIs" onMore={() => navigation.getParent()?.navigate('Finance', { screen: 'Loans' })}>
            {upcomingEMIs.map(({ loan, s }) => {
              const overdue = s.daysLeft < 0;
              const today = s.daysLeft === 0;
              const tagColor = overdue || today ? COLORS.negative : s.daysLeft <= 3 ? COLORS.hold : COLORS.subtext;
              return (
                <TouchableOpacity
                  key={loan.id}
                  style={styles.listRow}
                  activeOpacity={0.8}
                  onPress={() => navigation.getParent()?.navigate('Finance', { screen: 'LoanEdit', params: { id: loan.id } })}
                >
                  <View style={[styles.listIcon, { backgroundColor: '#E7EDFE' }]}>
                    <Ionicons name="cash-outline" size={15} color="#2E5BFF" />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.listTitle} numberOfLines={1}>{loan.name}</Text>
                    <Text style={styles.listMeta}>
                      {formatINR(s.emi)} ·{' '}
                      <Text style={{ color: tagColor, fontWeight: '800' }}>
                        {overdue ? `${-s.daysLeft}d overdue` : today ? 'Due today' : `in ${s.daysLeft}d`}
                      </Text>
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </Section>
        )}

        {/* Subscriptions */}
        {upcomingSubs.length > 0 && (
          <Section title="Upcoming renewals" onMore={() => navigation.getParent()?.navigate('Finance', { screen: 'Subscriptions' })}>
            {upcomingSubs.map((s) => {
              const d = Math.round((new Date(s.nextRenewal) - new Date()) / 86400000);
              return (
                <View key={s.id} style={styles.listRow}>
                  <View style={[styles.listIcon, { backgroundColor: COLORS.primarySoft }]}>
                    <Ionicons name="calendar-outline" size={15} color={COLORS.primary} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.listTitle} numberOfLines={1}>{s.name}</Text>
                    <Text style={styles.listMeta}>
                      {d < 0 ? `${-d}d ago` : d === 0 ? 'Renews today' : `in ${d}d`}
                    </Text>
                  </View>
                  <Text style={styles.listAmount}>{formatINR(s.amount)}</Text>
                </View>
              );
            })}
          </Section>
        )}

        {/* Empty state */}
        {expenses.length === 0 && goals.length === 0 && subs.length === 0 && loans.length === 0 && portfolioHoldings.length === 0 && watchlist.length === 0 && (
          <EmptyState
            emoji="🌱"
            title="Your dashboard is empty"
            message="Add an expense, set a goal, or add a stock to start seeing personalised insights."
            ctaLabel="Add your first expense"
            onCtaPress={() => setExpenseSheet(true)}
          />
        )}
      </ScrollView>

      {/* ── Quick add expense bottom sheet ───────────────────────────── */}
      <BottomSheet visible={expenseSheet} onClose={() => setExpenseSheet(false)} title="Add expense">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Text style={styles.sheetLabel}>Amount</Text>
          <View style={styles.sheetField}>
            <Text style={styles.sheetPrefix}>₹</Text>
            <TextInput
              style={styles.sheetInput}
              value={expForm.amount}
              onChangeText={(v) => setExpForm({ ...expForm, amount: v })}
              placeholder="0"
              placeholderTextColor={COLORS.faint}
              keyboardType="numeric"
              autoFocus
            />
          </View>

          <Text style={[styles.sheetLabel, { marginTop: 14 }]}>Category</Text>
          <View style={styles.catGrid}>
            {EXPENSE_CATEGORIES.map((cat) => {
              const sel = expForm.categoryId === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.catChip, sel && { backgroundColor: cat.color, borderColor: cat.color }]}
                  onPress={() => setExpForm({ ...expForm, categoryId: cat.id })}
                >
                  <Text style={{ fontSize: 13 }}>{cat.emoji}</Text>
                  <Text style={[styles.catChipText, sel && { color: '#fff' }]}>{cat.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.sheetLabel, { marginTop: 14 }]}>Note (optional)</Text>
          <View style={styles.sheetField}>
            <TextInput
              style={styles.sheetInput}
              value={expForm.note}
              onChangeText={(v) => setExpForm({ ...expForm, note: v })}
              placeholder="What was this for?"
              placeholderTextColor={COLORS.faint}
            />
          </View>

          <TouchableOpacity style={styles.sheetCta} onPress={submitExpense} activeOpacity={0.9}>
            <Text style={styles.sheetCtaText}>Add ₹{expForm.amount || '0'}</Text>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </BottomSheet>

      {/* ── Add to watchlist bottom sheet ────────────────────────────── */}
      <BottomSheet visible={watchSheet} onClose={() => setWatchSheet(false)} title="Add to watchlist">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.segment}>
            {['Stock', 'MF'].map((t) => {
              const sel = watchForm.type === t;
              return (
                <TouchableOpacity
                  key={t}
                  style={[styles.segItem, sel && styles.segItemActive]}
                  onPress={() => setWatchForm({ ...watchForm, type: t })}
                >
                  <Text style={[styles.segText, sel && { color: '#fff' }]}>{t === 'MF' ? 'Mutual Fund' : 'Stock'}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.sheetLabel, { marginTop: 14 }]}>Name</Text>
          <View style={styles.sheetField}>
            <TextInput
              style={styles.sheetInput}
              value={watchForm.name}
              onChangeText={(v) => setWatchForm({ ...watchForm, name: v })}
              placeholder="HDFC Bank Ltd"
              placeholderTextColor={COLORS.faint}
              autoFocus
            />
          </View>

          <Text style={[styles.sheetLabel, { marginTop: 14 }]}>{watchForm.type === 'MF' ? 'Scheme code' : 'Symbol'}</Text>
          <View style={styles.sheetField}>
            <TextInput
              style={styles.sheetInput}
              value={watchForm.symbol}
              onChangeText={(v) => setWatchForm({ ...watchForm, symbol: v.toUpperCase() })}
              placeholder={watchForm.type === 'MF' ? '120503' : 'HDFCBANK'}
              placeholderTextColor={COLORS.faint}
              autoCapitalize="characters"
            />
          </View>

          <TouchableOpacity style={styles.sheetCta} onPress={submitWatch} activeOpacity={0.9}>
            <Text style={styles.sheetCtaText}>Add to watchlist</Text>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </BottomSheet>
    </SafeAreaView>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function QuickChip({ icon, label, onPress, color }) {
  return (
    <TouchableOpacity style={styles.quickChip} activeOpacity={0.85} onPress={onPress}>
      <View style={[styles.quickIcon, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={styles.quickLabel} numberOfLines={1}>{label}</Text>
    </TouchableOpacity>
  );
}

function Section({ title, onMore, children }) {
  return (
    <View style={{ marginTop: 22 }}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionLabel}>{title}</Text>
        {onMore && (
          <TouchableOpacity onPress={onMore}>
            <Text style={styles.sectionMore}>See all</Text>
          </TouchableOpacity>
        )}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  body: { padding: 18, paddingTop: 8 },

  greeting: { fontSize: 24, fontWeight: '800', color: COLORS.text, letterSpacing: -0.4, marginTop: 14, marginBottom: 14 },

  // Above-fold metric grid (2 cards)
  metricRow: { flexDirection: 'row', gap: 10 },
  metricCard: {
    flex: 1, backgroundColor: COLORS.card, borderRadius: 12, padding: 16,
    borderWidth: 0.5, borderColor: COLORS.hairline,
  },
  metricLabel: { fontSize: 10, fontWeight: '800', color: '#888888', letterSpacing: 0.66, textTransform: 'uppercase' },
  metricValue: { ...MONO_STYLE, fontSize: 18, fontWeight: '800', color: COLORS.text, marginTop: 6, letterSpacing: -0.3 },
  metricDelta: { fontSize: 10.5, fontWeight: '800', color: COLORS.subtext, marginTop: 6 },

  // AI nudge — emerald-accented dismissible card.
  nudgeCard: {
    marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: COLORS.primary, borderRadius: 12, padding: 14,
  },
  nudgeOrb: { width: 28, height: 28, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.18)', justifyContent: 'center', alignItems: 'center' },
  nudgeLabel: { fontSize: 9.5, fontWeight: '800', color: 'rgba(255,255,255,0.7)', letterSpacing: 0.66, textTransform: 'uppercase' },
  nudgeText:  { fontSize: 13, color: '#fff', marginTop: 4, lineHeight: 18 },
  nudgeSub:   { fontSize: 11.5, color: 'rgba(255,255,255,0.85)', fontWeight: '600' },

  // Below-fold quick actions (horizontal scroll)
  quickScroll: { gap: 8, paddingVertical: 8 },
  quickChip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.card, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 0.5, borderColor: COLORS.hairline,
  },
  quickIcon: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { fontSize: 12.5, color: COLORS.text, fontWeight: '700' },

  // IPO banner
  ipoBanner: {
    marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.goldSoft, borderRadius: 12, padding: 14,
    borderWidth: 0.5, borderColor: 'rgba(184,136,26,0.25)',
  },
  ipoIcon: { width: 36, height: 36, borderRadius: 11, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  ipoTitle: { fontSize: 13, fontWeight: '800', color: COLORS.text },
  ipoSub:   { fontSize: 11, color: COLORS.subtext, marginTop: 2 },

  // Surplus card
  surplusCard: {
    marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.primarySoft, borderRadius: 12, padding: 16,
    borderWidth: 0.5, borderColor: 'rgba(11,93,59,0.18)',
  },
  surplusLabel: { fontSize: 10, fontWeight: '800', color: COLORS.primary, letterSpacing: 0.5 },
  surplusValue: { ...MONO_STYLE, fontSize: 18, fontWeight: '800', color: COLORS.primaryDeep, marginTop: 4 },
  surplusMeta:  { fontSize: 10.5, color: COLORS.subtext, fontWeight: '600', marginTop: 2 },
  surplusBtn:   { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.primary, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10 },
  surplusBtnText: { color: '#fff', fontWeight: '800', fontSize: 12 },

  // Section header + list rows
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 },
  sectionLabel:  { fontSize: 11, fontWeight: '800', color: '#888888', letterSpacing: 0.66, textTransform: 'uppercase', marginTop: 10 },
  sectionMore:   { fontSize: 11.5, fontWeight: '800', color: COLORS.primary },

  listRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.card, borderRadius: 12, padding: 14,
    borderWidth: 0.5, borderColor: COLORS.hairline, marginBottom: 8,
  },
  listIcon:   { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  listTitle:  { fontSize: 13.5, fontWeight: '800', color: COLORS.text },
  listMeta:   { fontSize: 11, color: COLORS.subtext, marginTop: 2 },
  listAmount: { ...MONO_STYLE, fontSize: 13, fontWeight: '800', color: COLORS.text },
  listPct:    { ...MONO_STYLE, fontSize: 10.5, fontWeight: '800', marginTop: 2 },

  goalSummary: { backgroundColor: COLORS.card, borderRadius: 12, padding: 16, borderWidth: 0.5, borderColor: COLORS.hairline },
  goalLabel: { fontSize: 11, color: COLORS.subtext, fontWeight: '700' },
  goalValue: { ...MONO_STYLE, fontSize: 18, fontWeight: '800', color: COLORS.text, marginTop: 4 },
  goalSub:   { fontSize: 12, color: COLORS.subtext, fontWeight: '600' },
  barTrack:  { height: 6, backgroundColor: '#E8EBE7', borderRadius: 3, marginTop: 10, overflow: 'hidden' },
  barFill:   { height: 6, backgroundColor: COLORS.primary, borderRadius: 3 },
  goalPct:   { fontSize: 11, color: COLORS.subtext, fontWeight: '700', marginTop: 6 },

  // Bottom sheet form
  sheetLabel:  { fontSize: 11, fontWeight: '800', color: '#888888', letterSpacing: 0.66, textTransform: 'uppercase', marginBottom: 6 },
  sheetField:  {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.background, borderRadius: 12,
    paddingHorizontal: 14, height: 50,
    borderWidth: 0.5, borderColor: COLORS.hairline,
  },
  sheetPrefix: { fontSize: 15, color: COLORS.subtext, marginRight: 6, fontWeight: '700' },
  sheetInput:  { flex: 1, fontSize: 15, color: COLORS.text, fontWeight: '700' },
  sheetCta:    { marginTop: 18, backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  sheetCtaText:{ color: '#fff', fontWeight: '800', fontSize: 14 },

  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 7,
    borderRadius: 999, borderWidth: 0.5, borderColor: COLORS.hairline,
    backgroundColor: COLORS.background,
  },
  catChipText: { fontSize: 11.5, fontWeight: '700', color: COLORS.text },

  segment: { flexDirection: 'row', backgroundColor: COLORS.background, borderRadius: 12, padding: 4, borderWidth: 0.5, borderColor: COLORS.hairline },
  segItem: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 9 },
  segItemActive: { backgroundColor: COLORS.primary },
  segText: { fontSize: 12.5, fontWeight: '800', color: COLORS.subtext },
});
