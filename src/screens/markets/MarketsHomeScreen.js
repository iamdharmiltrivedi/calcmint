import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, StyleSheet, ScrollView, RefreshControl,
  TextInput, TouchableOpacity, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../../constants/colors';
import { AppText, AppNumber, CurrencyText, ScreenTitle } from '../../components/typography';
import { usePortfolioStore } from '../../store/portfolioStore';
import { useMarketStore } from '../../store/marketStore';
import { getActiveIPOs } from '../../services/markets/IPOService';
import HoldingRow from '../../components/markets/HoldingRow';
import NewsCard from '../../components/markets/NewsCard';
import OfflineNotice from '../../components/markets/OfflineNotice';
import SectionHeader from '../../components/markets/SectionHeader';
import Badge from '../../components/markets/Badge';
import EmptyState from '../../components/ui/EmptyState';
import { SkeletonRow } from '../../components/ui/Skeleton';
import BrandHeader from '../../components/BrandHeader';

export default function MarketsHomeScreen({ navigation }) {
  const holdings   = usePortfolioStore((s) => s.holdings);
  const loadPort   = usePortfolioStore((s) => s.load);
  const prices     = usePortfolioStore((s) => s.prices);
  const summary    = usePortfolioStore((s) => s.getSummary());
  const allMetrics = usePortfolioStore((s) => s.getAllWithMetrics());

  const news               = useMarketStore((s) => s.news);
  const watchlist          = useMarketStore((s) => s.watchlist);
  const init               = useMarketStore((s) => s.init);
  const online             = useMarketStore((s) => s.online);
  const fetchingP          = useMarketStore((s) => s.isFetchingPrices);
  const refreshAll         = useMarketStore((s) => s.refreshAllPrices);
  const refreshWatchlist   = useMarketStore((s) => s.refreshWatchlistPrices);
  const refreshNews        = useMarketStore((s) => s.refreshNews);
  const noteSearch         = useMarketStore((s) => s.noteSearch);

  const [query, setQuery] = useState('');
  const [activeIPOs, setActiveIPOs] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadPort();
    init();
    getActiveIPOs().then(setActiveIPOs).catch(() => {});
  }, [loadPort, init]);

  const holdingsKey  = useMemo(() => holdings.map((h) => `${h.type}:${h.symbol}`).join('|'), [holdings]);
  const watchlistKey = useMemo(() => watchlist.map((w) => `${w.type}:${w.symbol}`).join('|'), [watchlist]);

  useEffect(() => {
    if (holdings.length) refreshAll(holdings);
  }, [holdingsKey, refreshAll]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (watchlist.length && typeof refreshWatchlist === 'function') refreshWatchlist();
  }, [watchlistKey, refreshWatchlist]); // eslint-disable-line react-hooks/exhaustive-deps

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refreshAll(holdings),
        typeof refreshWatchlist === 'function' ? refreshWatchlist() : Promise.resolve(),
        refreshNews(holdings),
        getActiveIPOs({ force: true }).then(setActiveIPOs),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [holdings, refreshAll, refreshWatchlist, refreshNews]);

  // Aggregate by symbol+type so two INFY entries (50 + 20 units) appear
  // as one "INFY · 70 units · avg ₹X" row on Markets. PortfolioScreen
  // intentionally keeps the per-entry list — that's where you manage
  // individual lots.
  const aggregatedMetrics = useMemo(() => {
    const byKey = new Map();
    for (const m of allMetrics) {
      const key = `${m.holding.type}:${m.holding.symbol}`;
      const cur = byKey.get(key);
      if (!cur) {
        byKey.set(key, {
          holding: { ...m.holding, _lotIds: [m.holding.id] },
          currentPrice:     m.currentPrice,
          currentValue:     m.currentValue,
          investedValue:    m.investedValue,
          profitLoss:       m.profitLoss,
          dayChangePercent: m.dayChangePercent,
          hasLivePrice:     m.hasLivePrice,
        });
      } else {
        const qty = cur.holding.quantity + m.holding.quantity;
        const invested = cur.investedValue + m.investedValue;
        cur.holding = {
          ...cur.holding,
          quantity:  qty,
          buyPrice:  qty > 0 ? invested / qty : 0,
          _lotIds:   [...cur.holding._lotIds, m.holding.id],
        };
        cur.currentValue  += m.currentValue;
        cur.investedValue  = invested;
        cur.profitLoss    += m.profitLoss;
      }
    }
    return Array.from(byKey.values()).map((m) => ({
      ...m,
      profitLossPercent: m.investedValue > 0 ? (m.profitLoss / m.investedValue) * 100 : 0,
    }));
  }, [allMetrics]);

  const topMovers = useMemo(() => {
    return [...aggregatedMetrics]
      .sort((a, b) => Math.abs(b.profitLossPercent) - Math.abs(a.profitLossPercent))
      .slice(0, 5);
  }, [aggregatedMetrics]);

  const submitSearch = async () => {
    const q = query.trim();
    if (!q) return;
    await noteSearch(q);
    navigation.navigate('AddEditStock', { prefillSymbol: q.toUpperCase() });
  };

  const positive = summary.totalProfitLoss >= 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <BrandHeader
        rightActions={[
          { icon: 'briefcase-outline', label: 'Portfolio', onPress: () => navigation.navigate('Portfolio') },
        ]}
      />
      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        keyboardShouldPersistTaps="handled"
      >
        <ScreenTitle style={styles.title}>Markets</ScreenTitle>

        {/* Search */}
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={16} color={COLORS.subtext} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search NSE/BSE symbol or MF code"
            placeholderTextColor={COLORS.faint}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={submitSearch}
            returnKeyType="search"
            autoCapitalize="characters"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={16} color={COLORS.faint} />
            </TouchableOpacity>
          )}
        </View>

        {!online && <View style={{ marginTop: 12 }}><OfflineNotice /></View>}

        {/* Portfolio strip */}
        <LinearGradient colors={COLORS.gradient} style={styles.hero}>
          <AppText variant="caption" color="rgba(255,255,255,0.6)" style={styles.heroLabel}>
            PORTFOLIO VALUE
          </AppText>
          <CurrencyText value={summary.totalCurrent} size="portfolio" color="#fff" style={styles.heroValue} />
          <View style={styles.heroBottom}>
            <View style={[styles.deltaPill, { backgroundColor: positive ? 'rgba(150,255,180,0.18)' : 'rgba(255,180,180,0.18)' }]}>
              <Ionicons name={positive ? 'arrow-up' : 'arrow-down'} size={11} color="#fff" />
              <AppNumber size="small" color="#fff" style={styles.deltaText}>
                {Math.abs(summary.totalProfitLossPercent).toFixed(2)}% · {Math.abs(summary.totalProfitLoss).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </AppNumber>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('Portfolio')}>
              <AppText variant="label" color="rgba(255,255,255,0.85)" style={styles.heroLink}>
                {summary.count} holdings ›
              </AppText>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Active IPOs banner */}
        {activeIPOs.length > 0 && (
          <TouchableOpacity style={styles.ipoBanner} activeOpacity={0.9} onPress={() => navigation.navigate('IPOTracker')}>
            <View style={styles.ipoIcon}>
              <Ionicons name="trending-up" size={18} color={COLORS.gold} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="label" style={styles.ipoTitle}>
                {activeIPOs.length} IPO{activeIPOs.length > 1 ? 's' : ''} open now
              </AppText>
              <AppText variant="caption" color={COLORS.subtext} style={styles.ipoSub} numberOfLines={1}>
                {activeIPOs.slice(0, 2).map((i) => i.name).join(' · ')}
              </AppText>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.subtext} />
          </TouchableOpacity>
        )}

        {/* Quick actions */}
        <View style={styles.quickRow}>
          <QuickAction icon="add-circle" label="Add Holding" onPress={() => navigation.navigate('AddEditStock')} color={COLORS.primary} />
          <QuickAction icon="podium-outline" label="IPOs"     onPress={() => navigation.navigate('IPOTracker')} color={COLORS.gold} />
          <QuickAction icon="newspaper-outline" label="News"   onPress={() => navigation.navigate('NewsFeed')} color="#2E5BFF" />
          <QuickAction icon="briefcase-outline" label="Portfolio" onPress={() => navigation.navigate('Portfolio')} color="#6F4FE0" />
        </View>

        {/* Watchlist */}
        <SectionHeader
          title="Watchlist"
          onMore={watchlist.length ? () => navigation.navigate('Portfolio') : null}
        />
        {watchlist.length === 0 ? (
          <EmptyState
            icon="star-outline"
            title="Watchlist is empty"
            message="Track stocks or funds without committing capital. Add to get price + AI updates."
            ctaLabel="+ Add to watchlist"
            onCtaPress={() => navigation.navigate('AddEditStock')}
            style={{ paddingVertical: 24 }}
          />
        ) : (
          <FlatList
            horizontal showsHorizontalScrollIndicator={false}
            data={watchlist}
            keyExtractor={(i) => i.symbol}
            renderItem={({ item }) => {
              const p = prices[item.symbol];
              const hasLive = !!(p && typeof p.currentPrice === 'number' && p.currentPrice > 0);
              const cp = hasLive ? p.currentPrice : null;
              const ch = hasLive && typeof p.changePercent === 'number' ? p.changePercent : 0;
              const up = ch >= 0;
              const cc = up ? COLORS.positive : COLORS.negative;
              return (
                <View style={styles.watchCard}>
                  <AppText variant="bodySmall" style={styles.watchSym} numberOfLines={1}>
                    {item.type === 'MF' ? item.name : item.symbol}
                  </AppText>
                  <AppText variant="caption" color={COLORS.subtext} style={styles.watchName} numberOfLines={1}>
                    {item.type === 'MF' ? `Scheme ${item.symbol}` : item.name}
                  </AppText>
                  {cp != null ? (
                    <CurrencyText value={cp} size="small" style={styles.watchPrice} />
                  ) : (
                    <AppNumber size="small" color={COLORS.faint} style={styles.watchPrice}>—</AppNumber>
                  )}
                  {hasLive ? (
                    <View style={[styles.watchPill, { backgroundColor: up ? COLORS.positiveSoft : COLORS.negativeSoft }]}>
                      <Ionicons name={up ? 'caret-up' : 'caret-down'} size={9} color={cc} />
                      <AppNumber size="small" color={cc} style={styles.watchPillText}>
                        {Math.abs(ch).toFixed(2)}%
                      </AppNumber>
                    </View>
                  ) : (
                    <AppText variant="caption" color={COLORS.faint} style={styles.watchStale}>No price yet</AppText>
                  )}
                  <Badge label={item.type === 'MF' ? 'MF' : (item.exchange || 'STK')} variant={item.type === 'MF' ? 'mf' : 'stock'} />
                </View>
              );
            }}
          />
        )}

        {/* Top movers */}
        {topMovers.length > 0 && (
          <>
            <SectionHeader title="Top movers" onMore={() => navigation.navigate('Portfolio')} />
            {topMovers.map((m) => (
              <HoldingRow
                key={m.holding.id}
                metrics={m}
                onPress={() => navigation.navigate('StockDetail', { holdingId: m.holding.id })}
              />
            ))}
          </>
        )}

        {/* News */}
        <SectionHeader title="Market news" onMore={() => navigation.navigate('NewsFeed')} />
        {fetchingP && news.length === 0 ? (
          <SkeletonRow count={3} />
        ) : news.length === 0 ? (
          <EmptyState
            icon="newspaper-outline"
            title="No news yet"
            message="Once you add holdings, we'll surface relevant Indian market stories here."
            style={{ paddingVertical: 24 }}
          />
        ) : (
          news.slice(0, 5).map((n) => (
            <NewsCard key={n.id} item={n} onPress={() => navigation.navigate('NewsDetail', { id: n.id })} />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function QuickAction({ icon, label, onPress, color }) {
  return (
    <TouchableOpacity style={styles.quickItem} activeOpacity={0.85} onPress={onPress}>
      <View style={[styles.quickIcon, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <AppText variant="tabLabel" style={styles.quickLabel}>{label}</AppText>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  body: { padding: 18, paddingBottom: 40 },

  title: { marginBottom: 12 },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.card, borderRadius: 14,
    paddingHorizontal: 12, height: 46,
    borderWidth: 1, borderColor: COLORS.border,
  },
  // Inputs need explicit fontFamily — RN won't inherit from <View>.
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    fontFamily: 'Inter_500Medium',
  },

  hero: { borderRadius: 24, padding: 20, overflow: 'hidden', marginTop: 14 },
  heroLabel: { letterSpacing: 1.4 },
  heroValue: { marginTop: 6, letterSpacing: -1 },
  heroBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  deltaPill:  { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  deltaText:  { fontSize: 11 },
  heroLink:   { fontSize: 13 },

  ipoBanner: {
    marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.goldSoft, borderRadius: 14, padding: 12,
    borderWidth: 1, borderColor: 'rgba(184,136,26,0.18)',
  },
  ipoIcon: {
    width: 36, height: 36, borderRadius: 11,
    backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center',
  },
  ipoTitle: {},
  ipoSub:   { marginTop: 2 },

  quickRow:  { flexDirection: 'row', gap: 10, marginTop: 14 },
  quickItem: { flex: 1, alignItems: 'center' },
  quickIcon: { width: 50, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  quickLabel: { textAlign: 'center' },

  watchCard: {
    width: 140, padding: 12, borderRadius: 12,
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border,
    marginRight: 8, gap: 4,
  },
  watchSym: {},
  watchName: { marginBottom: 4 },
  watchPrice: { marginTop: 2, fontSize: 14 },
  watchPill: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999,
    alignSelf: 'flex-start', marginTop: 2,
  },
  watchPillText: { fontSize: 11 },
  watchStale: { marginTop: 2 },
});
