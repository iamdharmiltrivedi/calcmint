import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { AppText, AppNumber, CurrencyText } from '../../components/typography';
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

  const holdingsKey = useMemo(
    () => holdings.map((h) => `${h.type}:${h.symbol}`).join('|'),
    [holdings],
  );

  useEffect(() => {
    if (holdings.length) refreshAll(holdings);
  }, [holdingsKey, refreshAll]); // eslint-disable-line react-hooks/exhaustive-deps

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
        <AppText variant="cardTitle" style={styles.headerTitle}>Portfolio</AppText>
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
          <AppText variant="caption" color="rgba(255,255,255,0.6)" style={styles.heroLabel}>
            TOTAL VALUE
          </AppText>
          <CurrencyText value={summary.totalCurrent} size="portfolio" color="#fff" style={styles.heroValue} />
          <View style={styles.heroSplit}>
            <View style={{ flex: 1 }}>
              <AppText variant="caption" color="rgba(255,255,255,0.55)" style={styles.heroStatLabel}>
                INVESTED
              </AppText>
              <CurrencyText value={summary.totalInvested} size="small" color="#fff" style={styles.heroStatValue} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="caption" color="rgba(255,255,255,0.55)" style={styles.heroStatLabel}>
                P&L
              </AppText>
              <CurrencyText value={summary.totalProfitLoss} signed size="small" color={color} style={styles.heroStatValue} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="caption" color="rgba(255,255,255,0.55)" style={styles.heroStatLabel}>
                RETURN
              </AppText>
              <AppNumber size="small" color={color} style={styles.heroStatValue}>
                {positive ? '+' : ''}{summary.totalProfitLossPercent.toFixed(2)}%
              </AppNumber>
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
              <AppText variant="bodySmall" style={styles.adviceText}>Thinking…</AppText>
            </View>
          ) : advice ? (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={styles.aiOrb}><Ionicons name="sparkles" size={13} color={COLORS.gold} /></View>
                <AppText variant="bodySmall" style={styles.adviceText}>{advice}</AppText>
              </View>
              <TouchableOpacity style={styles.adviceRefresh} onPress={askAdvice}>
                <Ionicons name="refresh" size={12} color={COLORS.primary} />
                <AppText variant="caption" color={COLORS.primary} style={styles.adviceRefreshText}>Refresh</AppText>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity onPress={askAdvice} disabled={!allMetrics.length}>
              <AppText
                variant="label"
                color={COLORS.primary}
                style={[styles.adviceCta, !allMetrics.length && { opacity: 0.4 }]}
              >
                {allMetrics.length ? 'Tap to get a personalised tip' : 'Add holdings to get advice'}
              </AppText>
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
              <AppText
                variant="label"
                color={filter === f.key ? '#fff' : COLORS.subtext}
                style={styles.filterText}
              >
                {f.label}
              </AppText>
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
  headerTitle: { letterSpacing: -0.2 },

  hero: { borderRadius: 24, padding: 20, overflow: 'hidden' },
  heroLabel: { letterSpacing: 1.4 },
  heroValue: { marginTop: 6, letterSpacing: -1 },
  heroSplit: { flexDirection: 'row', gap: 12, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.10)' },
  heroStatLabel: { letterSpacing: 0.4, fontSize: 10 },
  heroStatValue: { marginTop: 3 },

  adviceCard: {
    backgroundColor: COLORS.card, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: COLORS.border,
  },
  aiOrb: { width: 26, height: 26, borderRadius: 8, backgroundColor: COLORS.goldSoft, justifyContent: 'center', alignItems: 'center' },
  adviceText: { flex: 1 },
  adviceCta:  {},
  adviceRefresh: { marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' },
  adviceRefreshText: {},

  filters: { flexDirection: 'row', gap: 6, marginTop: 18, marginBottom: 8 },
  filter:  { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  filterActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterText:   {},

  empty: { alignItems: 'center', paddingVertical: 40 },
});
