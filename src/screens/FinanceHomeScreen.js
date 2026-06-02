import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, MONO_STYLE } from '../constants/colors';
import StorageService from '../services/StorageService';
import { useApp } from '../context/AppContext';
import { summarizeLoan, totalMonthlyObligation } from '../utils/loans';
import { formatINR, formatINRFull } from '../utils/formatters';
import EmptyState from '../components/ui/EmptyState';
import FAB from '../components/ui/FAB';
import BrandHeader from '../components/BrandHeader';

const inMonth = (iso) => {
  const now = new Date();
  const d = new Date(iso);
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
};
const sum = (arr, sel) => arr.reduce((s, x) => s + (sel ? sel(x) : x), 0);
const CYCLE_MONTHS = { monthly: 1, quarterly: 3, yearly: 12 };
const monthlyOfSub = (s) => s.amount / (CYCLE_MONTHS[s.cycle] || 1);

export default function FinanceHomeScreen({ navigation }) {
  const { expenses, goals } = useApp();
  const [subs,  setSubs]  = useState([]);
  const [loans, setLoans] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [s, l] = await Promise.all([
      StorageService.getSubscriptions(),
      StorageService.getLoans(),
    ]);
    setSubs(s); setLoans(l);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => navigation.addListener('focus', load), [navigation, load]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const monthSpend = useMemo(() => sum(expenses.filter((e) => inMonth(e.date || e.createdAt)), (e) => e.amount), [expenses]);
  const monthSubs  = useMemo(() => sum(subs, monthlyOfSub), [subs]);
  const monthlyEMI = useMemo(() => totalMonthlyObligation(loans), [loans]);

  const activeLoans  = useMemo(() => loans.filter((l) => !summarizeLoan(l).isClosed), [loans]);
  const activeGoals  = useMemo(() => goals.filter((g) => (g.saved || 0) < (g.target || g.targetAmount || 0)), [goals]);
  const activeSubs   = subs;

  const everythingEmpty = expenses.length === 0 && loans.length === 0 && subs.length === 0 && goals.length === 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <BrandHeader
        rightActions={[
          { icon: 'people-outline', label: 'Split groups', onPress: () => navigation.navigate('SplitGroups') },
        ]}
      />

      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        {/* Top stat strip */}
        <View style={styles.statRow}>
          <Stat label="Spent (mo)"    value={formatINR(monthSpend)} />
          <Stat label="EMI / mo"      value={formatINR(monthlyEMI)} />
          <Stat label="Subs / mo"     value={formatINR(monthSubs)} />
        </View>

        {everythingEmpty ? (
          <EmptyState
            emoji="🌱"
            title="No financial data yet"
            message="Add an expense, loan, or subscription to start tracking and getting reminders."
            ctaLabel="Add expense"
            onCtaPress={() => navigation.navigate('AddExpense')}
            style={{ marginTop: 24 }}
          />
        ) : (
          <>
            <SectionTile
              icon="receipt-outline"
              accent={COLORS.primary}
              title="Expenses"
              subtitle={`${expenses.length} txns · ${formatINRFull(monthSpend)} this month`}
              onPress={() => navigation.navigate('Expenses')}
              ctaIcon="add"
              ctaOnPress={() => navigation.navigate('AddExpense')}
            />
            <SectionTile
              icon="cash-outline"
              accent="#2E5BFF"
              title="Loans"
              subtitle={`${activeLoans.length} active · ${formatINR(monthlyEMI)} / mo`}
              onPress={() => navigation.navigate('Loans')}
              ctaIcon="add"
              ctaOnPress={() => navigation.navigate('AddLoan', {})}
            />
            <SectionTile
              icon="card-outline"
              accent="#0F8C8B"
              title="Subscriptions"
              subtitle={`${activeSubs.length} active · ${formatINR(monthSubs)} / mo`}
              onPress={() => navigation.navigate('Subscriptions')}
              ctaIcon="add"
              ctaOnPress={() => navigation.navigate('AddSubscription')}
            />
            <SectionTile
              icon="flag-outline"
              accent={COLORS.gold}
              title="Goals"
              subtitle={activeGoals.length === 0 ? 'No goals yet — set one' : `${activeGoals.length} in progress`}
              onPress={() => navigation.navigate('Goals')}
              ctaIcon="add"
              ctaOnPress={() => navigation.navigate('AddGoal')}
            />
            <SectionTile
              icon="airplane-outline"
              accent="#E07A1F"
              title="Trips"
              subtitle="Group docs & expenses by trip"
              onPress={() => navigation.navigate('Trips')}
              ctaIcon="add"
              ctaOnPress={() => navigation.navigate('AddTrip')}
            />
            <SectionTile
              icon="people-outline"
              accent="#6F4FE0"
              title="Split groups"
              subtitle="Track shared expenses"
              onPress={() => navigation.navigate('SplitGroups')}
            />
          </>
        )}
      </ScrollView>

      <FAB icon="add" onPress={() => navigation.navigate('AddExpense')} bottom={24} />
    </SafeAreaView>
  );
}

function Stat({ label, value }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function SectionTile({ icon, accent, title, subtitle, onPress, ctaIcon, ctaOnPress }) {
  return (
    <TouchableOpacity style={styles.tile} activeOpacity={0.85} onPress={onPress}>
      <View style={[styles.tileIcon, { backgroundColor: accent + '18' }]}>
        <Ionicons name={icon} size={20} color={accent} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.tileTitle}>{title}</Text>
        <Text style={styles.tileSub} numberOfLines={1}>{subtitle}</Text>
      </View>
      {ctaIcon ? (
        <TouchableOpacity
          style={[styles.tileCta, { backgroundColor: accent }]}
          onPress={(e) => { e.stopPropagation(); ctaOnPress && ctaOnPress(); }}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Ionicons name={ctaIcon} size={16} color="#fff" />
        </TouchableOpacity>
      ) : (
        <Ionicons name="chevron-forward" size={16} color={COLORS.faint} />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  body: { padding: 18, paddingBottom: 100 },

  statRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  stat: {
    flex: 1, backgroundColor: COLORS.card, borderRadius: 12, padding: 12,
    borderWidth: 0.5, borderColor: COLORS.hairline,
  },
  statLabel: { fontSize: 10, color: '#888888', fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
  statValue: { ...MONO_STYLE, fontSize: 14, fontWeight: '800', color: COLORS.text, marginTop: 4 },

  tile: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.card, borderRadius: 12, padding: 16,
    borderWidth: 0.5, borderColor: COLORS.hairline, marginTop: 10,
  },
  tileIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  tileTitle: { fontSize: 14, fontWeight: '800', color: COLORS.text },
  tileSub: { fontSize: 11.5, color: COLORS.subtext, marginTop: 2 },
  tileCta: { width: 30, height: 30, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
});
