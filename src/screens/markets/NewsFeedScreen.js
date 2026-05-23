import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { usePortfolioStore } from '../../store/portfolioStore';
import { useMarketStore } from '../../store/marketStore';
import NewsCard from '../../components/markets/NewsCard';
import OfflineNotice from '../../components/markets/OfflineNotice';
import EmptyState from '../../components/ui/EmptyState';
import { SkeletonRow } from '../../components/ui/Skeleton';

const FILTERS = [
  { key: 'All',      label: 'All' },
  { key: 'Positive', label: 'Positive' },
  { key: 'Neutral',  label: 'Neutral' },
  { key: 'Negative', label: 'Negative' },
];

export default function NewsFeedScreen({ navigation }) {
  const holdings    = usePortfolioStore((s) => s.holdings);
  const news        = useMarketStore((s) => s.news);
  const refreshNews = useMarketStore((s) => s.refreshNews);
  const fetching    = useMarketStore((s) => s.isFetchingNews);
  const online      = useMarketStore((s) => s.online);
  const loadCached  = useMarketStore((s) => s.loadCachedNews);

  const [filter, setFilter] = useState('All');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { loadCached(); }, [loadCached]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshNews(holdings);
    setRefreshing(false);
  }, [holdings, refreshNews]);

  const filtered = useMemo(() => {
    if (filter === 'All') return news;
    return news.filter((n) => n.sentiment === filter);
  }, [news, filter]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.headerIcon} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>News</Text>
        <TouchableOpacity style={styles.headerIcon} onPress={onRefresh}>
          <Ionicons name="refresh" size={17} color={COLORS.text} />
        </TouchableOpacity>
      </View>

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

      {!online && <View style={{ paddingHorizontal: 18, marginTop: 8 }}><OfflineNotice /></View>}

      <FlatList
        data={filtered}
        keyExtractor={(n) => n.id}
        contentContainerStyle={styles.body}
        renderItem={({ item }) => <NewsCard item={item} onPress={() => navigation.navigate('NewsDetail', { id: item.id })} />}
        refreshControl={<RefreshControl refreshing={refreshing || fetching} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        ListEmptyComponent={(
          fetching && news.length === 0
            ? <View style={{ paddingHorizontal: 18 }}><SkeletonRow count={4} /></View>
            : <EmptyState
                icon="newspaper-outline"
                title="No news yet"
                message="Add holdings, then pull down to refresh the feed."
              />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  body: { padding: 18, paddingBottom: 40 },

  headerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 6 },
  headerIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text, letterSpacing: -0.2 },

  filters: { flexDirection: 'row', gap: 6, paddingHorizontal: 18, marginTop: 6, marginBottom: 4 },
  filter:  { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  filterActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterText:   { fontSize: 11.5, fontWeight: '800', color: COLORS.subtext },
  filterTextActive: { color: '#fff' },

  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 14, fontWeight: '800', color: COLORS.text, marginTop: 10 },
  emptyHint:  { fontSize: 11.5, color: COLORS.subtext, marginTop: 4 },
});
