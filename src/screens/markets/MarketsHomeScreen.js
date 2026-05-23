import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  TextInput, TouchableOpacity, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, MONO_STYLE } from '../../constants/colors';
import { formatINR } from '../../utils/formatters';
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
  const summary    = usePortfolioStore((s) => s.getSummary());
  const allMetrics = usePortfolioStore((s) => s.getAllWithMetrics());

  const news        = useMarketStore((s) => s.news);
  const watchlist   = useMarketStore((s) => s.watchlist);
  const init        = useMarketStore((s) => s.init);
  const online      = useMarketStore((s) => s.online);
  const fetchingP   = useMarketStore((s) => s.isFetchingPrices);
  const refreshAll  = useMarketStore((s) => s.refreshAllPrices);
  const refreshNews = useMarketStore((s) => s.refreshNews);
  const noteSearch  = useMarketStore((s) => s.noteSearch);

  const [query, setQuery] = useState('');
  const [activeIPOs, setActiveIPOs] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadPort();
    init();
    getActiveIPOs().then(setActiveIPOs).catch(() => {});
  }, [loadPort, init]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refreshAll(holdings),
        refreshNews(holdings),
        getActiveIPOs({ force: true }).then(setActiveIPOs),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [holdings, refreshAll, refreshNews]);

  const topMovers = useMemo(() => {
    return [...allMetrics]
      .sort((a, b) => Math.abs(b.profitLossPercent) - Math.abs(a.profitLossPercent))
      .slice(0, 5);
  }, [allMetrics]);

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
        <Text style={styles.title}>Markets</Text>

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
          <Text style={styles.heroLabel}>PORTFOLIO VALUE</Text>
          <Text style={styles.heroValue}>{formatINR(summary.totalCurrent)}</Text>
          <View style={styles.heroBottom}>
            <View style={[styles.deltaPill, { backgroundColor: positive ? 'rgba(150,255,180,0.18)' : 'rgba(255,180,180,0.18)' }]}>
              <Ionicons name={positive ? 'arrow-up' : 'arrow-down'} size={11} color="#fff" />
              <Text style={styles.deltaText}>{Math.abs(summary.totalProfitLossPercent).toFixed(2)}% · {formatINR(Math.abs(summary.totalProfitLoss))}</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('Portfolio')}>
              <Text style={styles.heroLink}>{summary.count} holdings ›</Text>
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
              <Text style={styles.ipoTitle}>{activeIPOs.length} IPO{activeIPOs.length > 1 ? 's' : ''} open now</Text>
              <Text style={styles.ipoSub} numberOfLines={1}>
                {activeIPOs.slice(0, 2).map((i) => i.name).join(' · ')}
              </Text>
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
            renderItem={({ item }) => (
              <View style={styles.watchCard}>
                <Text style={styles.watchSym}>{item.symbol}</Text>
                <Text style={styles.watchName} numberOfLines={1}>{item.name}</Text>
                <Badge label={item.type === 'MF' ? 'MF' : (item.exchange || 'STK')} variant={item.type === 'MF' ? 'mf' : 'stock'} />
              </View>
            )}
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
      <Text style={styles.quickLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  body: { padding: 18, paddingBottom: 40 },

  title: { fontSize: 24, fontWeight: '800', color: COLORS.text, letterSpacing: -0.4, marginBottom: 12 },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.card, borderRadius: 14,
    paddingHorizontal: 12, height: 46,
    borderWidth: 1, borderColor: COLORS.border,
  },
  searchInput: { flex: 1, fontSize: 13.5, color: COLORS.text, fontWeight: '600' },

  hero: { borderRadius: 24, padding: 20, overflow: 'hidden', marginTop: 14 },
  heroLabel: { fontSize: 10.5, fontWeight: '700', letterSpacing: 1.4, color: 'rgba(255,255,255,0.6)' },
  heroValue: { ...MONO_STYLE, fontSize: 32, fontWeight: '700', color: '#fff', marginTop: 6, letterSpacing: -1 },
  heroBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  deltaPill:  { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  deltaText:  { ...MONO_STYLE, fontSize: 11, color: '#fff', fontWeight: '700' },
  heroLink:   { fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '700' },

  ipoBanner: {
    marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.goldSoft, borderRadius: 14, padding: 12,
    borderWidth: 1, borderColor: 'rgba(184,136,26,0.18)',
  },
  ipoIcon: {
    width: 36, height: 36, borderRadius: 11,
    backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center',
  },
  ipoTitle: { fontSize: 13, fontWeight: '800', color: COLORS.text },
  ipoSub:   { fontSize: 11, color: COLORS.subtext, marginTop: 2 },

  quickRow:  { flexDirection: 'row', gap: 10, marginTop: 14 },
  quickItem: { flex: 1, alignItems: 'center' },
  quickIcon: { width: 50, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  quickLabel:{ fontSize: 10.5, color: COLORS.text, fontWeight: '700', textAlign: 'center' },

  watchCard: {
    width: 130, padding: 12, borderRadius: 12,
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border,
    marginRight: 8, gap: 4,
  },
  watchSym:  { fontSize: 13, fontWeight: '800', color: COLORS.text },
  watchName: { fontSize: 11, color: COLORS.subtext, marginBottom: 4 },

  emptyMini: {
    backgroundColor: COLORS.card, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', gap: 8,
  },
  emptyMiniText: { fontSize: 12, color: COLORS.subtext, textAlign: 'center' },
  emptyMiniCta:  { fontSize: 12, color: COLORS.primary, fontWeight: '800' },
});
