import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, MONO_STYLE } from '../../constants/colors';
import { formatINR } from '../../utils/formatters';
import { getIPOs } from '../../services/markets/IPOService';
import NotificationService from '../../services/NotificationService';
import ScreenHeader from '../../components/ui/ScreenHeader';
import EmptyState from '../../components/ui/EmptyState';
import ErrorRetry from '../../components/ui/ErrorRetry';
import { SkeletonRow } from '../../components/ui/Skeleton';

const TABS = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'active',   label: 'Active'   },
  { key: 'closed',   label: 'Closed'   },
  { key: 'listed',   label: 'Listed'   },
];

const STATUS_TONE = {
  active:   { border: COLORS.positive, bg: COLORS.positiveSoft, fg: COLORS.positive, label: 'OPEN NOW' },
  upcoming: { border: COLORS.hold,     bg: COLORS.holdSoft,     fg: COLORS.hold,     label: 'UPCOMING' },
  closed:   { border: COLORS.subtext,  bg: '#F1F2EF',           fg: COLORS.subtext,  label: 'CLOSED' },
  listed:   { border: COLORS.primary,  bg: COLORS.primarySoft,  fg: COLORS.primary,  label: 'LISTED' },
};

const fmtDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

export default function IPOTrackerScreen({ navigation }) {
  const [tab, setTab] = useState('active');
  const [items, setItems] = useState(null);   // null = loading; [] = empty
  const [refreshing, setRefreshing] = useState(false);
  const [online, setOnline] = useState(true);
  const [lastSuccess, setLastSuccess] = useState(null);
  const [keyMissing, setKeyMissing] = useState(false);

  const load = useCallback(async (force = false) => {
    try {
      const data = await getIPOs({ force });
      setItems(data);
      setLastSuccess(Date.now());
      setOnline(true);
      setKeyMissing(false);
    } catch (e) {
      if (e?.code === 'NO_KEY') {
        setKeyMissing(true);
        setItems([]);
        return;
      }
      setOnline(false);
      setItems((prev) => (prev === null ? [] : prev));
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load(true);
    setRefreshing(false);
  };

  const filtered = useMemo(() => (items || []).filter((i) => i.status === tab), [items, tab]);

  const onSetReminder = async (ipo) => {
    const open = new Date(ipo.openDate);
    open.setHours(10, 0, 0, 0);
    if (open <= new Date()) return Alert.alert('Already open', 'This IPO opens today or has opened.');
    const id = await NotificationService.scheduleAt(open, {
      title: `${ipo.name} IPO opens today`,
      body:  `Price band ₹${ipo.priceMin}–${ipo.priceMax}. Lot size ${ipo.lotSize}.`,
      data:  { kind: 'ipo', ipoId: ipo.id },
    });
    if (id) {
      Alert.alert('Reminder set', `We’ll remind you on ${fmtDate(ipo.openDate)} at 10:00 AM.`);
    } else {
      Alert.alert('Could not set reminder', 'Notification permission was declined.');
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader parent="Markets" title="IPO Tracker" onBack={() => navigation.goBack()} />

      {/* Tabs */}
      <View style={styles.tabs}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, tab === t.key && styles.tabActive]}
            onPress={() => setTab(t.key)}
            activeOpacity={0.85}
          >
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {keyMissing && (
          <View style={{ marginBottom: 12 }}>
            <ErrorRetry
              title="IPO Alerts API key missing"
              message="Set EXPO_PUBLIC_IPO_ALERTS_API_KEY (or FALLBACK_KEY in IPOService.js) to load live IPOs from ipoalerts.in."
              onRetry={onRefresh}
            />
          </View>
        )}

        {!online && !keyMissing && (
          <View style={{ marginBottom: 12 }}>
            <ErrorRetry
              title="Couldn’t reach the IPO feed"
              message="Showing the last calendar we have."
              lastSuccessAt={lastSuccess}
              onRetry={onRefresh}
            />
          </View>
        )}

        {items === null ? (
          <SkeletonRow count={4} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="podium-outline"
            title={`No ${tab} IPOs right now`}
            message="Pull down to refresh the calendar, or check back tomorrow."
          />
        ) : (
          filtered.map((i) => <IPOCard key={i.id} ipo={i} onSetReminder={onSetReminder} navigation={navigation} />)
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function IPOCard({ ipo, onSetReminder, navigation }) {
  const tone = STATUS_TONE[ipo.status] || STATUS_TONE.upcoming;
  const subscription = typeof ipo.subscription === 'number' ? ipo.subscription : null;
  const subPct = subscription != null ? Math.min(100, (subscription / 5) * 100) : null; // 5x = full bar

  return (
    <View style={[styles.card, { borderLeftColor: tone.border, borderLeftWidth: 4 }]}>
      <View style={styles.cardHead}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.cardName} numberOfLines={1}>{ipo.name}</Text>
          <View style={styles.sectorRow}>
            <View style={styles.sectorBadge}>
              <Text style={styles.sectorText}>{ipo.sector}</Text>
            </View>
            <Text style={styles.dates}>{fmtDate(ipo.openDate)} – {fmtDate(ipo.closeDate)}</Text>
          </View>
        </View>
        <View style={[styles.statusPill, { backgroundColor: tone.bg }]}>
          <Text style={[styles.statusText, { color: tone.fg }]}>{tone.label}</Text>
        </View>
      </View>

      {/* Price + lot + GMP */}
      <View style={styles.metricsRow}>
        <Metric label="Price band" value={`₹${ipo.priceMin}–${ipo.priceMax}`} />
        <Metric label="Lot size"   value={`${ipo.lotSize}`} />
        {typeof ipo.gmp === 'number' && (
          <Metric label="GMP" value={`₹${ipo.gmp}`} valueColor={ipo.gmp > 0 ? COLORS.positive : COLORS.negative} />
        )}
      </View>

      {/* Subscription bar */}
      {subPct != null && (
        <View style={{ marginTop: 12 }}>
          <View style={styles.subHead}>
            <Text style={styles.subLabel}>Subscription</Text>
            <Text style={styles.subValue}>{subscription.toFixed(1)}×</Text>
          </View>
          <View style={styles.subTrack}>
            <View style={[styles.subFill, { width: `${Math.max(3, subPct)}%`, backgroundColor: tone.border }]} />
          </View>
        </View>
      )}

      {/* Listing pill for "listed" IPOs */}
      {ipo.status === 'listed' && ipo.listingPrice && (
        <View style={[styles.listingPill, { backgroundColor: ipo.listingGain >= 0 ? COLORS.positiveSoft : COLORS.negativeSoft }]}>
          <Ionicons name={ipo.listingGain >= 0 ? 'trending-up' : 'trending-down'} size={14} color={ipo.listingGain >= 0 ? COLORS.positive : COLORS.negative} />
          <Text style={[styles.listingText, { color: ipo.listingGain >= 0 ? COLORS.positive : COLORS.negative }]}>
            Listed at {formatINR(ipo.listingPrice)} · {ipo.listingGain >= 0 ? '+' : ''}{ipo.listingGain}%
          </Text>
        </View>
      )}

      {/* CTAs */}
      <View style={styles.ctaRow}>
        {ipo.status === 'upcoming' && (
          <TouchableOpacity style={styles.reminderBtn} onPress={() => onSetReminder(ipo)} activeOpacity={0.85}>
            <Ionicons name="notifications-outline" size={14} color={COLORS.primary} />
            <Text style={styles.reminderText}>Set reminder</Text>
          </TouchableOpacity>
        )}
        {ipo.status === 'active' && (
          <TouchableOpacity
            style={styles.calcBtn}
            onPress={() => navigation.navigate('LumpsumCalculator')}
            activeOpacity={0.85}
          >
            <Ionicons name="calculator-outline" size={14} color="#fff" />
            <Text style={styles.calcText}>Calculate min investment</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function Metric({ label, value, valueColor }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, valueColor && { color: valueColor }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  body: { padding: 18, paddingBottom: 40 },

  tabs: {
    flexDirection: 'row', backgroundColor: COLORS.card, borderRadius: 12,
    marginHorizontal: 18, marginTop: 8, padding: 4,
    borderWidth: 0.5, borderColor: COLORS.hairline,
  },
  tab:     { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 9 },
  tabActive: { backgroundColor: COLORS.primary },
  tabText:   { fontSize: 11.5, fontWeight: '800', color: COLORS.subtext },
  tabTextActive: { color: '#fff' },

  card: {
    backgroundColor: COLORS.card, borderRadius: 12, padding: 16,
    borderWidth: 0.5, borderColor: COLORS.hairline,
    marginBottom: 12,
  },
  cardHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  cardName: { fontSize: 14.5, fontWeight: '800', color: COLORS.text },
  sectorRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  sectorBadge: {
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999,
    backgroundColor: COLORS.background,
    borderWidth: 0.5, borderColor: COLORS.hairline,
  },
  sectorText: { fontSize: 10, fontWeight: '800', color: COLORS.subtext, letterSpacing: 0.2 },
  dates:      { fontSize: 11, color: COLORS.subtext, fontWeight: '700' },

  statusPill: {
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999,
  },
  statusText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.6 },

  metricsRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  metric: {
    flex: 1,
    backgroundColor: COLORS.background, borderRadius: 10, padding: 10,
    borderWidth: 0.5, borderColor: COLORS.hairline,
  },
  metricLabel: { fontSize: 10, color: '#888888', fontWeight: '800', letterSpacing: 0.4, textTransform: 'uppercase' },
  metricValue: { ...MONO_STYLE, fontSize: 13, fontWeight: '800', color: COLORS.text, marginTop: 3 },

  subHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 },
  subLabel: { fontSize: 11, fontWeight: '700', color: COLORS.subtext },
  subValue: { ...MONO_STYLE, fontSize: 12.5, fontWeight: '800', color: COLORS.text },
  subTrack: { height: 6, backgroundColor: '#F0F2EF', borderRadius: 999, overflow: 'hidden' },
  subFill:  { height: 6, borderRadius: 999 },

  listingPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 12, padding: 9, borderRadius: 10,
  },
  listingText: { fontSize: 12, fontWeight: '800' },

  ctaRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  reminderBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10,
    backgroundColor: COLORS.primarySoft,
  },
  reminderText: { color: COLORS.primary, fontWeight: '800', fontSize: 12 },
  calcBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    paddingVertical: 10, borderRadius: 10, backgroundColor: COLORS.primary,
  },
  calcText: { color: '#fff', fontWeight: '800', fontSize: 12 },
});
