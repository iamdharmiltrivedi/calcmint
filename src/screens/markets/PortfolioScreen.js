import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, MONO_STYLE } from '../../constants/colors';
import { formatINR } from '../../utils/formatters';
import { usePortfolioStore } from '../../store/portfolioStore';
import { useMarketStore } from '../../store/marketStore';
import { generateRebalanceAdvice } from '../../services/markets/AiAnalysisService';
import HoldingRow from '../../components/markets/HoldingRow';
import OfflineNotice from '../../components/markets/OfflineNotice';
import SectionHeader from '../../components/markets/SectionHeader';
import EmptyState from '../../components/ui/EmptyState';
import { SkeletonRow } from '../../components/ui/Skeleton';

const FILTERS = [
  { key: 'all',   label: 'All' },
  { key: 'Stock', label: 'Stocks' },
  { key: 'MF',    label: 'Mutual Funds' },
];

export default function PortfolioScreen({ navigation }) {
  const holdings   = usePortfolioStore((s) => s.holdings);
  const load       = usePortfolioStore((s) => s.load);
  const summary    = usePortfolioStore((s) => s.getSummary());
  const allMetrics = usePortfolioStore((s) => s.getAllWithMetrics());

  const refreshAll = useMarketStore((s) => s.refreshAllPrices);
  const fetching   = useMarketStore((s) => s.isFetchingPrices);
  const online     = useMarketStore((s) => s.online);

  const [filter, setFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [advice, setAdvice] = useState(null);
  const [adviceLoading, setAdviceLoading] = useState(false);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshAll(holdings);
    setRefreshing(false);
  }, [holdings, refreshAll]);

  const filtered = useMemo(() => {
    if (filter === 'all') return allMetrics;
    return allMetrics.filter((m) => m.holding.type === filter);
  }, [allMetrics, filter]);

  const positive = summary.totalProfitLoss >= 0;
  const color    = positive ? '#A0F2C7' : '#FFB8C4';

  const askAdvice = async () => {
    setAdviceLoading(true);
    try {
      const a = await generateRebalanceAdvice(allMetrics);
      setAdvice(a);
    } finally {
      setAdviceLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.headerIcon} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Portfolio</Text>
        <TouchableOpacity style={styles.headerIcon} onPress={() => navigation.navigate('AddEditStock')}>
          <Ionicons name="add" size={20} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={refreshing || fetching} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero summary */}
        <LinearGradient colors={COLORS.gradient} style={styles.hero}>
          <Text style={styles.heroLabel}>TOTAL VALUE</Text>
          <Text style={styles.heroValue}>{formatINR(summary.totalCurrent)}</Text>
          <View style={styles.heroSplit}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroStatLabel}>INVESTED</Text>
              <Text style={styles.heroStatValue}>{formatINR(summary.totalInvested)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroStatLabel}>P&L</Text>
              <Text style={[styles.heroStatValue, { color }]}>
                {positive ? '+' : ''}{formatINR(summary.totalProfitLoss)}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroStatLabel}>RETURN</Text>
              <Text style={[styles.heroStatValue, { color }]}>
                {positive ? '+' : ''}{summary.totalProfitLossPercent.toFixed(2)}%
              </Text>
            </View>
          </View>
        </LinearGradient>

        {!online && <View style={{ marginTop: 12 }}><OfflineNotice /></View>}

        {/* AI rebalancing */}
        <SectionHeader title="AI rebalancing advice" />
        <View style={styles.adviceCard}>
          {adviceLoading ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <ActivityIndicator color={COLORS.primary} size="small" />
              <Text style={styles.adviceText}>Thinking…</Text>
            </View>
          ) : advice ? (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={styles.aiOrb}><Ionicons name="sparkles" size={13} color={COLORS.gold} /></View>
                <Text style={styles.adviceText}>{advice}</Text>
              </View>
              <TouchableOpacity style={styles.adviceRefresh} onPress={askAdvice}>
                <Ionicons name="refresh" size={12} color={COLORS.primary} />
                <Text style={styles.adviceRefreshText}>Refresh</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity onPress={askAdvice} disabled={!allMetrics.length}>
              <Text style={[styles.adviceCta, !allMetrics.length && { opacity: 0.4 }]}>
                {allMetrics.length ? 'Tap to get a personalised tip' : 'Add holdings to get advice'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Filters */}
        <View style={styles.filters}>
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filter, filter === f.key && styles.filterActive]}
              onPress={() => setFilter(f.key)}
              activeOpacity={0.8}
            >
              <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* List */}
        {fetching && filtered.length === 0 ? (
          <SkeletonRow count={4} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="briefcase-outline"
            title="No holdings yet"
            message={filter === 'all'
              ? 'Add your first stock or fund to start tracking value and P&L.'
              : `You have no ${filter === 'MF' ? 'mutual funds' : 'stocks'} yet. Switch the filter above or add a new holding.`}
            ctaLabel="Add holding"
            onCtaPress={() => navigation.navigate('AddEditStock')}
          />
        ) : (
          filtered.map((m) => (
            <HoldingRow
              key={m.holding.id}
              metrics={m}
              onPress={() => navigation.navigate('StockDetail', { holdingId: m.holding.id })}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  body: { padding: 18, paddingBottom: 40 },

  headerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 6 },
  headerIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text, letterSpacing: -0.2 },

  hero: { borderRadius: 24, padding: 20, overflow: 'hidden' },
  heroLabel: { fontSize: 10.5, fontWeight: '700', letterSpacing: 1.4, color: 'rgba(255,255,255,0.6)' },
  heroValue: { ...MONO_STYLE, fontSize: 32, fontWeight: '700', color: '#fff', marginTop: 6, letterSpacing: -1 },
  heroSplit: { flexDirection: 'row', gap: 12, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.10)' },
  heroStatLabel: { fontSize: 9.5, color: 'rgba(255,255,255,0.55)', fontWeight: '700', letterSpacing: 0.4 },
  heroStatValue: { ...MONO_STYLE, fontSize: 13, fontWeight: '700', color: '#fff', marginTop: 3 },

  adviceCard: {
    backgroundColor: COLORS.card, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: COLORS.border,
  },
  aiOrb: { width: 26, height: 26, borderRadius: 8, backgroundColor: COLORS.goldSoft, justifyContent: 'center', alignItems: 'center' },
  adviceText: { flex: 1, fontSize: 12.5, color: COLORS.text, lineHeight: 18 },
  adviceCta:  { fontSize: 12.5, color: COLORS.primary, fontWeight: '800' },
  adviceRefresh: { marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' },
  adviceRefreshText: { fontSize: 11, color: COLORS.primary, fontWeight: '800' },

  filters: { flexDirection: 'row', gap: 6, marginTop: 18, marginBottom: 8 },
  filter:  { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  filterActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterText:   { fontSize: 11.5, fontWeight: '800', color: COLORS.subtext },
  filterTextActive: { color: '#fff' },

  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { fontSize: 14, fontWeight: '800', color: COLORS.text, marginTop: 10 },
  emptyHint:  { fontSize: 11.5, color: COLORS.subtext, marginTop: 4 },
});
