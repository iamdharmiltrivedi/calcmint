import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, MONO_STYLE } from '../constants/colors';
import StorageService from '../services/StorageService';
import { formatINR, formatINRFull } from '../utils/formatters';
import { summarizeLoan, totalMonthlyObligation } from '../utils/loans';
import { useApp } from '../context/AppContext';
import BrandHeader from '../components/BrandHeader';

const inMonth = (iso, monthOffset = 0) => {
  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const d = new Date(iso);
  return d.getFullYear() === target.getFullYear() && d.getMonth() === target.getMonth();
};

const sum = (arr, sel) => arr.reduce((s, x) => s + (sel ? sel(x) : x), 0);

const CYCLE_MONTHS = { monthly: 1, quarterly: 3, yearly: 12 };

const monthlyOfSub = (s) => {
  const months = CYCLE_MONTHS[s.cycle] || 1;
  return s.amount / months;
};

const daysUntil = (iso) => {
  if (!iso) return Infinity;
  const d = new Date(iso); const t = new Date();
  t.setHours(0, 0, 0, 0); d.setHours(0, 0, 0, 0);
  return Math.round((d - t) / 86400000);
};

export default function DashboardScreen({ navigation }) {
  const { expenses, goals } = useApp();
  const [subs, setSubs] = useState([]);
  const [loans, setLoans] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [s, l] = await Promise.all([
      StorageService.getSubscriptions(),
      StorageService.getLoans(),
    ]);
    setSubs(s);
    setLoans(l);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const focus = navigation.addListener('focus', load);
    return focus;
  }, [navigation, load]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const monthSpend     = useMemo(() => sum(expenses.filter((e) => inMonth(e.date || e.createdAt, 0)),  (e) => e.amount), [expenses]);
  const lastMonthSpend = useMemo(() => sum(expenses.filter((e) => inMonth(e.date || e.createdAt, -1)), (e) => e.amount), [expenses]);
  const monthSubs      = useMemo(() => sum(subs, monthlyOfSub), [subs]);

  const delta = lastMonthSpend > 0 ? ((monthSpend - lastMonthSpend) / lastMonthSpend) * 100 : null;

  const upcomingSubs = useMemo(
    () => [...subs]
      .filter((s) => s.nextRenewal)
      .sort((a, b) => new Date(a.nextRenewal) - new Date(b.nextRenewal))
      .slice(0, 3),
    [subs],
  );

  const monthlyEMI = useMemo(() => totalMonthlyObligation(loans), [loans]);
  const upcomingEMIs = useMemo(
    () => loans
      .map((l) => ({ loan: l, s: summarizeLoan(l) }))
      .filter((x) => !x.s.isClosed && x.s.daysLeft != null)
      .sort((a, b) => a.s.daysLeft - b.s.daysLeft)
      .slice(0, 3),
    [loans],
  );

  const goalProgress = useMemo(() => {
    if (goals.length === 0) return null;
    const total = sum(goals, (g) => g.target || 0);
    const saved = sum(goals, (g) => g.saved || 0);
    return { total, saved, pct: total > 0 ? (saved / total) * 100 : 0, count: goals.length };
  }, [goals]);

  const activeGoals = useMemo(
    () => [...goals]
      .filter((g) => (g.saved || 0) < (g.target || 0))
      .sort((a, b) => (b.saved / b.target) - (a.saved / a.target))
      .slice(0, 3),
    [goals],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <BrandHeader
        rightActions={[
          { icon: 'settings-outline', label: 'Settings', onPress: () => navigation.navigate('Settings') },
        ]}
      />
      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        <Text style={styles.greeting}>{greeting()}</Text>

        {/* This-month hero */}
        <LinearGradient colors={COLORS.gradient} style={styles.hero}>
          <View style={styles.heroOrb} />
          <Text style={styles.heroLabel}>SPENT THIS MONTH</Text>
          <Text style={styles.heroValue}>{formatINRFull(monthSpend)}</Text>
          {delta !== null && (
            <View style={[styles.deltaPill, { backgroundColor: delta >= 0 ? 'rgba(255,180,180,0.15)' : 'rgba(150,255,180,0.15)' }]}>
              <Ionicons name={delta >= 0 ? 'arrow-up' : 'arrow-down'} size={11} color="#fff" />
              <Text style={styles.deltaText}>
                {Math.abs(delta).toFixed(0)}% vs last month
              </Text>
            </View>
          )}
          <View style={styles.heroSplit}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroStatLabel}>EMI / MO</Text>
              <Text style={styles.heroStatValue}>{formatINR(monthlyEMI)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroStatLabel}>SUBS / MO</Text>
              <Text style={styles.heroStatValue}>{formatINR(monthSubs)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroStatLabel}>GOALS</Text>
              <Text style={styles.heroStatValue}>{goals.length}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Quick actions */}
        <View style={styles.quickRow}>
          <QuickAction icon="add-circle" label="Expense" onPress={() => navigation.getParent()?.navigate('Expenses')} color={COLORS.primary} />
          <QuickAction icon="cash" label="Loans" onPress={() => navigation.navigate('Loans')} color="#2E5BFF" />
          <QuickAction icon="people" label="Split" onPress={() => navigation.navigate('SplitGroups')} color="#6F4FE0" />
          <QuickAction icon="card" label="Subs" onPress={() => navigation.navigate('Subscriptions')} color="#0F8C8B" />
          <QuickAction icon="document-text" label="Docs" onPress={() => navigation.navigate('Receipts')} color="#C5562A" />
        </View>

        {/* Upcoming EMIs */}
        {upcomingEMIs.length > 0 && (
          <Section title="Upcoming EMIs" onMore={() => navigation.navigate('Loans')}>
            {upcomingEMIs.map(({ loan, s }) => {
              const overdue = s.daysLeft < 0;
              const today = s.daysLeft === 0;
              const tagColor = overdue || today ? COLORS.error : s.daysLeft <= 3 ? COLORS.warning : COLORS.subtext;
              return (
                <TouchableOpacity
                  key={loan.id}
                  style={styles.listRow}
                  activeOpacity={0.8}
                  onPress={() => navigation.navigate('LoanEdit', { id: loan.id })}
                >
                  <View style={[styles.listIcon, { backgroundColor: '#E7EDFE' }]}>
                    <Ionicons name="cash-outline" size={15} color="#2E5BFF" />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.listTitle} numberOfLines={1}>{loan.name}</Text>
                    <Text style={styles.listMeta}>
                      {formatINR(s.emi)} ·{' '}
                      <Text style={{ color: tagColor, fontWeight: '700' }}>
                        {overdue ? `${-s.daysLeft}d overdue` : today ? 'Due today' : `in ${s.daysLeft}d`}
                      </Text>
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </Section>
        )}

        {/* Upcoming renewals */}
        {upcomingSubs.length > 0 && (
          <Section title="Upcoming renewals" onMore={() => navigation.navigate('Subscriptions')}>
            {upcomingSubs.map((s) => {
              const d = daysUntil(s.nextRenewal);
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

        {/* Goal progress */}
        {goalProgress && (
          <Section title="Goal progress" onMore={() => navigation.navigate('Goals')}>
            <View style={styles.goalSummary}>
              <View style={{ flex: 1 }}>
                <Text style={styles.goalLabel}>Saved across {goalProgress.count} goal{goalProgress.count > 1 ? 's' : ''}</Text>
                <Text style={styles.goalValue}>
                  {formatINRFull(goalProgress.saved)} <Text style={styles.goalSub}>of {formatINR(goalProgress.total)}</Text>
                </Text>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${Math.min(100, goalProgress.pct)}%` }]} />
                </View>
                <Text style={styles.goalPct}>{goalProgress.pct.toFixed(0)}% reached</Text>
              </View>
            </View>
            {activeGoals.map((g) => {
              const pct = g.target > 0 ? (g.saved / g.target) * 100 : 0;
              return (
                <View key={g.id} style={styles.listRow}>
                  <View style={[styles.listIcon, { backgroundColor: '#F7EBCC' }]}>
                    <Ionicons name="flag" size={15} color="#B8881A" />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.listTitle} numberOfLines={1}>{g.name}</Text>
                    <Text style={styles.listMeta}>{pct.toFixed(0)}% · {formatINR(g.saved || 0)}/{formatINR(g.target)}</Text>
                  </View>
                </View>
              );
            })}
          </Section>
        )}

        {/* If everything is empty */}
        {expenses.length === 0 && goals.length === 0 && subs.length === 0 && loans.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🌱</Text>
            <Text style={styles.emptyTitle}>Your dashboard is empty</Text>
            <Text style={styles.emptyHint}>
              Add an expense, set a goal, or log a subscription to start seeing insights here.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function QuickAction({ icon, label, onPress, color }) {
  return (
    <TouchableOpacity style={styles.quickItem} activeOpacity={0.85} onPress={onPress}>
      <View style={[styles.quickIcon, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.quickLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function Section({ title, onMore, children }) {
  return (
    <View style={{ marginTop: 18 }}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {onMore && (
          <TouchableOpacity onPress={onMore}><Text style={styles.sectionMore}>View all</Text></TouchableOpacity>
        )}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  body: { padding: 18, paddingBottom: 40 },

  greeting: { fontSize: 22, fontWeight: '800', color: COLORS.text, letterSpacing: -0.3, marginBottom: 14 },

  hero: { borderRadius: 24, padding: 20, overflow: 'hidden', position: 'relative' },
  heroOrb: {
    position: 'absolute', right: -50, top: -50,
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: 'rgba(201,162,74,0.22)',
  },
  heroLabel: { fontSize: 10.5, fontWeight: '700', letterSpacing: 1.4, color: 'rgba(255,255,255,0.6)' },
  heroValue: { ...MONO_STYLE, fontSize: 34, fontWeight: '700', color: '#fff', marginTop: 6, letterSpacing: -1 },
  deltaPill: {
    alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, marginTop: 8,
  },
  deltaText: { fontSize: 11, color: '#fff', fontWeight: '700' },
  heroSplit: {
    flexDirection: 'row', gap: 12, marginTop: 14, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.10)',
  },
  heroStatLabel: { fontSize: 9.5, color: 'rgba(255,255,255,0.55)', fontWeight: '600', letterSpacing: 0.4 },
  heroStatValue: { ...MONO_STYLE, fontSize: 14, fontWeight: '700', color: '#fff', marginTop: 3 },

  quickRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  quickItem: { flex: 1, alignItems: 'center' },
  quickIcon: {
    width: 50, height: 50, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', marginBottom: 6,
  },
  quickLabel: { fontSize: 11, color: COLORS.text, fontWeight: '600' },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: COLORS.text, letterSpacing: -0.2 },
  sectionMore: { fontSize: 11, fontWeight: '700', color: COLORS.primary },

  listRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.card, borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: 8,
  },
  listIcon: {
    width: 32, height: 32, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  listTitle: { fontSize: 13.5, fontWeight: '700', color: COLORS.text },
  listMeta:  { fontSize: 11, color: COLORS.subtext, marginTop: 2 },
  listAmount: { ...MONO_STYLE, fontSize: 13, fontWeight: '700', color: COLORS.text },

  goalSummary: {
    backgroundColor: COLORS.card, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: 8,
  },
  goalLabel: { fontSize: 11, color: COLORS.subtext, fontWeight: '600' },
  goalValue: { ...MONO_STYLE, fontSize: 18, fontWeight: '700', color: COLORS.text, marginTop: 4 },
  goalSub:   { fontSize: 12, color: COLORS.subtext, fontWeight: '600' },
  barTrack:  { height: 6, backgroundColor: '#E8EBE7', borderRadius: 3, marginTop: 10, overflow: 'hidden' },
  barFill:   { height: 6, backgroundColor: COLORS.primary, borderRadius: 3 },
  goalPct:   { fontSize: 11, color: COLORS.subtext, fontWeight: '600', marginTop: 6 },

  empty: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 12 },
  emptyIcon: { fontSize: 38, marginBottom: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  emptyHint: { fontSize: 12, color: COLORS.subtext, marginTop: 4, textAlign: 'center', lineHeight: 18 },
});
