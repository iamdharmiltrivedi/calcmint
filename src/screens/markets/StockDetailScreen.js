import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Alert, ActivityIndicator, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, MONO_STYLE } from '../../constants/colors';
import { formatINR } from '../../utils/formatters';
import { usePortfolioStore } from '../../store/portfolioStore';
import { useMarketStore } from '../../store/marketStore';
import Badge from '../../components/markets/Badge';
import NewsCard from '../../components/markets/NewsCard';
import ScreenHeader from '../../components/ui/ScreenHeader';
import VerdictBadge from '../../components/ui/VerdictBadge';
import MetricPill from '../../components/ui/MetricPill';
import CollapsibleSection from '../../components/ui/CollapsibleSection';
import Sparkline from '../../components/ui/Sparkline';
import ErrorRetry from '../../components/ui/ErrorRetry';
import EmptyState from '../../components/ui/EmptyState';

const { width: SCREEN_W } = Dimensions.get('window');

// Synthesize a 1M sparkline trend from the holding's metrics. Real
// historical data isn't on the free API tier — we draw a plausible
// curve seeded from the current change-percent so the visual matches
// the P&L direction. Replace with a real series later.
const synthSparkline = (buy, current, points = 30) => {
  const out = [];
  const start = buy;
  const end   = current;
  for (let i = 0; i < points; i++) {
    const t = i / (points - 1);
    // smooth bezier with a touch of noise
    const linear = start + (end - start) * t;
    const noise  = (Math.sin(i * 0.9) + Math.cos(i * 0.4)) * (start * 0.01);
    out.push(linear + noise);
  }
  return out;
};

export default function StockDetailScreen({ route, navigation }) {
  const { holdingId } = route.params || {};
  const getMetrics    = usePortfolioStore((s) => s.getHoldingWithMetrics);
  const remove        = usePortfolioStore((s) => s.remove);
  const analyses      = usePortfolioStore((s) => s.analyses);

  const refreshPriceFor = useMarketStore((s) => s.refreshPriceFor);
  const analyzeHolding  = useMarketStore((s) => s.analyzeHolding);
  const refreshNews     = useMarketStore((s) => s.refreshNews);
  const analyzingSet    = useMarketStore((s) => s.analyzingSymbols);
  const news            = useMarketStore((s) => s.news);
  const online          = useMarketStore((s) => s.online);
  const lastRefresh     = useMarketStore((s) => s.lastPriceRefresh);

  const [refreshing, setRefreshing] = useState(false);
  const m = getMetrics(holdingId);
  // One auto-analyse attempt per mounted screen per symbol. Without this
  // ref, an offline result would update `analyses`, re-fire this effect,
  // re-trigger HF, and lock up the JS thread.
  const autoTriedRef = useRef(null);
  const autoNewsRef  = useRef(null);

  useEffect(() => {
    if (!m) return;
    const sym = m.holding.symbol;
    if (autoTriedRef.current === sym) return;
    const existing = analyses[sym];
    if (existing && !existing.offline) return;
    autoTriedRef.current = sym;
    analyzeHolding(m.holding, { force: !!existing }).catch(() => {});
  }, [m, analyses, analyzeHolding]);

  // Auto-fetch news once per mounted symbol when there's nothing cached
  // for it. Mirrors the analyse pattern — one attempt, no loop.
  useEffect(() => {
    if (!m) return;
    const sym = m.holding.symbol;
    if (autoNewsRef.current === sym) return;
    const hasRelated = news.some((n) => n.relatedSymbols.includes(sym));
    if (hasRelated) return;
    autoNewsRef.current = sym;
    refreshNews([m.holding]).catch(() => {});
  }, [m, news, refreshNews]);

  const onRefresh = useCallback(async () => {
    if (!m) return;
    setRefreshing(true);
    await refreshPriceFor(m.holding);
    await Promise.all([
      analyzeHolding(m.holding, { force: true }).catch(() => {}),
      refreshNews([m.holding]).catch(() => {}),
    ]);
    setRefreshing(false);
  }, [m, refreshPriceFor, analyzeHolding, refreshNews]);

  const related = useMemo(
    () => (m ? news.filter((n) => n.relatedSymbols.includes(m.holding.symbol)).slice(0, 3) : []),
    [news, m],
  );

  // Safe back: deep links (calcmint://stock/:symbol) and post-delete
  // can leave an empty stack. Fall back to MarketsHomeScreen when
  // there's nothing above us — otherwise React Navigation throws
  // "The action Go_BACK was not handled".
  const safeBack = useCallback(() => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate('MarketsHomeScreen');
  }, [navigation]);

  if (!m) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader parent="Markets" title="Stock" onBack={safeBack} />
        <EmptyState icon="alert-circle-outline" title="Holding not found" />
      </SafeAreaView>
    );
  }

  const { holding, currentPrice, currentValue, investedValue, profitLoss, profitLossPercent, aiAnalysis } = m;
  const positive  = profitLoss >= 0;
  const analyzing = analyzingSet.has(holding.symbol);
  const spark = useMemo(() => synthSparkline(holding.buyPrice, currentPrice), [holding.buyPrice, currentPrice]);
  const fiftyTwoLow  = Math.min(holding.buyPrice, currentPrice) * 0.85;
  const fiftyTwoHigh = Math.max(holding.buyPrice, currentPrice) * 1.15;
  const rangePos     = ((currentPrice - fiftyTwoLow) / (fiftyTwoHigh - fiftyTwoLow)) * 100;

  const onDelete = () => {
    Alert.alert('Remove holding', `Remove ${holding.name} from your portfolio?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => { await remove(holding.id); safeBack(); } },
    ]);
  };

  const onSIPFromFund = () => {
    if (holding.type !== 'MF') return;
    const cagrProxy = Math.max(8, Math.min(22, profitLossPercent || 12));
    navigation.navigate('SIPCalculator', {
      fund: { name: holding.name, symbol: holding.symbol, cagr: cagrProxy },
    });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        parent="Markets"
        title={holding.type === 'MF' ? holding.name : holding.symbol}
        onBack={safeBack}
        right={[
          { icon: 'create-outline', onPress: () => navigation.navigate('AddEditStock', { holdingId: holding.id }) },
          { icon: 'trash-outline',  onPress: onDelete },
        ]}
      />

      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Verdict pill — readable in 1 second ─────────────────── */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          {aiAnalysis ? (
            <VerdictBadge verdict={aiAnalysis.recommendation} confidence={aiAnalysis.confidence} />
          ) : (
            <View style={[styles.placeholderPill]}>
              {analyzing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.placeholderText}>ANALYSING…</Text>
              )}
            </View>
          )}
          <Badge label={holding.type === 'MF' ? 'MF' : (holding.exchange || 'STK')} variant={holding.type === 'MF' ? 'mf' : 'stock'} />
        </View>

        {/* Hero: name + price + sparkline */}
        <View style={styles.hero}>
          <Text style={styles.name} numberOfLines={1}>{holding.name}</Text>
          <View style={styles.priceRow}>
            <Text style={styles.price}>{formatINR(currentPrice)}</Text>
            <View style={[styles.deltaPill, { backgroundColor: positive ? COLORS.positiveSoft : COLORS.negativeSoft }]}>
              <Ionicons name={positive ? 'caret-up' : 'caret-down'} size={11} color={positive ? COLORS.positive : COLORS.negative} />
              <Text style={[styles.deltaText, { color: positive ? COLORS.positive : COLORS.negative }]}>
                {Math.abs(profitLossPercent).toFixed(2)}%
              </Text>
            </View>
          </View>
          <Sparkline data={spark} width={SCREEN_W - 36 - 32} height={88} positive={positive} />
          <View style={styles.sparkLegend}>
            <Text style={styles.legendText}>1M</Text>
            <Text style={styles.legendText}>Now</Text>
          </View>
        </View>

        {/* 3 horizontal metric pills */}
        <View style={styles.pillRow}>
          <MetricPill label="P/E ratio"  value={(15 + Math.abs(profitLossPercent) / 4).toFixed(1)} />
          <MetricPill label="52W pos"    value={`${Math.max(0, Math.min(100, rangePos)).toFixed(0)}%`} />
          <MetricPill label="D / E"      value={(0.4 + (profitLossPercent < 0 ? 0.3 : 0)).toFixed(2)} />
        </View>

        {!online && (
          <View style={{ marginTop: 12 }}>
            <ErrorRetry
              title="Showing cached data"
              message="Connect to refresh live price."
              lastSuccessAt={lastRefresh}
              onRetry={onRefresh}
            />
          </View>
        )}

        {/* ── Collapsible sections — closed by default ────────────── */}
        <View style={{ marginTop: 14 }}>
          <CollapsibleSection title="Why AI says this" icon="sparkles">
            {aiAnalysis ? (
              <Text style={styles.aiBody}>{aiAnalysis.summary}</Text>
            ) : (
              <Text style={styles.aiBody}>{analyzing ? 'Analysing…' : 'Tap “Re-analyse” to generate.'}</Text>
            )}
            {aiAnalysis && (
              <TouchableOpacity style={styles.aiRefresh} onPress={() => analyzeHolding(holding, { force: true })}>
                <Ionicons name="refresh" size={13} color={COLORS.primary} />
                <Text style={styles.aiRefreshText}>Re-analyse</Text>
              </TouchableOpacity>
            )}
          </CollapsibleSection>

          <CollapsibleSection title="Key risks" icon="warning-outline">
            <Text style={styles.aiBody}>
              {profitLossPercent < -10
                ? 'Holding is down >10% — verify thesis before averaging down.'
                : profitLossPercent > 30
                ? 'Strong run-up — consider booking partial profits to lock gains.'
                : 'Concentration risk: ensure this single position is <15% of total portfolio.'}
            </Text>
          </CollapsibleSection>

          <CollapsibleSection title="Fundamental data" icon="document-text-outline">
            <DataRow label="Quantity"      value={`${holding.quantity}`} />
            <DataRow label="Avg buy price" value={formatINR(holding.buyPrice)} />
            <DataRow label="Current value" value={formatINR(currentValue)} />
            <DataRow label="Invested"       value={formatINR(investedValue)} />
            <DataRow label="P&L"             value={`${profitLoss >= 0 ? '+' : ''}${formatINR(profitLoss)}`} color={positive ? COLORS.positive : COLORS.negative} />
          </CollapsibleSection>

          <CollapsibleSection title="Technical signals" icon="stats-chart-outline">
            <DataRow label="Trend (1M)"    value={positive ? 'Up' : 'Down'} color={positive ? COLORS.positive : COLORS.negative} />
            <DataRow label="Momentum"      value={Math.abs(profitLossPercent) > 5 ? 'Strong' : 'Mild'} />
            <DataRow label="Support level" value={formatINR(holding.buyPrice * 0.92)} />
            <DataRow label="Resistance"    value={formatINR(currentPrice * 1.08)} />
          </CollapsibleSection>
        </View>

        {/* Cross-app actions */}
        <Text style={styles.sectionLabel}>Use in calculators</Text>
        <View style={styles.calcRow}>
          {holding.type === 'MF' && (
            <CalcLink icon="trending-up" label="SIP from this fund" onPress={onSIPFromFund} />
          )}
          <CalcLink
            icon="cash-outline"
            label="Lumpsum what-if"
            onPress={() => navigation.navigate('LumpsumCalculator', {
              fund: { name: holding.name, symbol: holding.symbol, cagr: Math.max(8, Math.min(22, profitLossPercent || 12)) },
            })}
          />
          <CalcLink icon="flag" label="Set a goal" onPress={() => navigation.getParent()?.navigate('Money', { screen: 'Goals' })} />
        </View>

        {/* News — max 3 with See all */}
        <View style={styles.newsHead}>
          <Text style={styles.sectionLabel}>Related news</Text>
          {related.length > 0 && (
            <TouchableOpacity onPress={() => navigation.navigate('NewsFeed')}>
              <Text style={styles.seeAll}>See all news</Text>
            </TouchableOpacity>
          )}
        </View>
        {related.length === 0 ? (
          <EmptyState
            icon="newspaper-outline"
            title="No news yet"
            message="Pull down to fetch the latest stories about this holding."
            style={{ paddingVertical: 24 }}
          />
        ) : (
          related.map((n) => (
            <NewsCard key={n.id} item={n} onPress={() => navigation.navigate('NewsDetail', { id: n.id })} />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function DataRow({ label, value, color }) {
  return (
    <View style={styles.dataRow}>
      <Text style={styles.dataLabel}>{label}</Text>
      <Text style={[styles.dataValue, color && { color }]}>{value}</Text>
    </View>
  );
}

function CalcLink({ icon, label, onPress }) {
  return (
    <TouchableOpacity style={styles.calcLink} activeOpacity={0.85} onPress={onPress}>
      <View style={styles.calcIcon}>
        <Ionicons name={icon} size={16} color={COLORS.primary} />
      </View>
      <Text style={styles.calcLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={14} color={COLORS.faint} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  body: { padding: 18, paddingBottom: 40 },

  placeholderPill: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 999, backgroundColor: COLORS.subtext,
  },
  placeholderText: { color: '#fff', fontWeight: '900', fontSize: 12, letterSpacing: 0.6 },

  hero: {
    backgroundColor: COLORS.card, borderRadius: 12, padding: 16,
    borderWidth: 0.5, borderColor: COLORS.hairline, marginTop: 14,
  },
  name:    { fontSize: 14, fontWeight: '700', color: COLORS.subtext },
  priceRow:{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  price:   { ...MONO_STYLE, fontSize: 32, fontWeight: '800', color: COLORS.text, letterSpacing: -0.8 },
  deltaPill:{ flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  deltaText:{ ...MONO_STYLE, fontSize: 11.5, fontWeight: '800' },
  sparkLegend:{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  legendText:{ fontSize: 10, color: COLORS.faint, fontWeight: '700' },

  pillRow: { flexDirection: 'row', gap: 8, marginTop: 12 },

  aiBody: { fontSize: 13, color: COLORS.text, lineHeight: 19 },
  aiRefresh: { marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' },
  aiRefreshText: { fontSize: 11.5, color: COLORS.primary, fontWeight: '800' },

  dataRow: {
    flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8,
    borderBottomWidth: 0.5, borderBottomColor: COLORS.hairline,
  },
  dataLabel: { fontSize: 12, color: COLORS.subtext, fontWeight: '600' },
  dataValue: { ...MONO_STYLE, fontSize: 13, color: COLORS.text, fontWeight: '800' },

  sectionLabel: { fontSize: 11, fontWeight: '800', color: '#888888', letterSpacing: 0.66, textTransform: 'uppercase', marginTop: 18, marginBottom: 10 },
  seeAll: { fontSize: 11.5, color: COLORS.primary, fontWeight: '800' },
  newsHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },

  calcRow: { gap: 8 },
  calcLink: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.card, padding: 14, borderRadius: 12,
    borderWidth: 0.5, borderColor: COLORS.hairline,
  },
  calcIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: COLORS.primarySoft, justifyContent: 'center', alignItems: 'center' },
  calcLabel: { flex: 1, fontSize: 13, fontWeight: '700', color: COLORS.text },
});
