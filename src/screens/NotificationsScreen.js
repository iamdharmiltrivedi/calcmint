import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import StorageService from '../services/StorageService';
import { summarizeLoan } from '../utils/loans';
import { formatINR } from '../utils/formatters';
import ScreenHeader from '../components/ui/ScreenHeader';
import EmptyState from '../components/ui/EmptyState';

const daysUntil = (iso) => {
  if (!iso) return null;
  const d = new Date(iso); const t = new Date();
  t.setHours(0, 0, 0, 0); d.setHours(0, 0, 0, 0);
  return Math.round((d - t) / 86400000);
};

// Live in-app notifications view. Derives from upcoming/overdue
// EMIs + renewals. The Expo notification queue isn't introspectable
// across reboots, so we recompute from CalcMint data on focus.
export default function NotificationsScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [loans, subs] = await Promise.all([
      StorageService.getLoans(),
      StorageService.getSubscriptions(),
    ]);
    const out = [];
    for (const l of loans) {
      const s = summarizeLoan(l);
      if (s.isClosed || s.daysLeft == null) continue;
      out.push({
        id: `emi-${l.id}`,
        kind: 'emi',
        title: `${l.name} EMI`,
        body: `${formatINR(s.emi)} · ${s.daysLeft < 0 ? `${-s.daysLeft}d overdue` : s.daysLeft === 0 ? 'due today' : `in ${s.daysLeft}d`}`,
        daysLeft: s.daysLeft,
        route: 'LoanEdit',
        params: { id: l.id },
      });
    }
    for (const sub of subs) {
      const d = daysUntil(sub.nextRenewal);
      if (d == null) continue;
      out.push({
        id: `sub-${sub.id}`,
        kind: 'sub',
        title: `${sub.name} renewal`,
        body: `${formatINR(sub.amount)} · ${d < 0 ? `${-d}d ago` : d === 0 ? 'today' : `in ${d}d`}`,
        daysLeft: d,
        route: 'Subscriptions',
      });
    }
    out.sort((a, b) => (a.daysLeft ?? 999) - (b.daysLeft ?? 999));
    setItems(out);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => navigation.addListener('focus', load), [navigation, load]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader parent="Home" title="Notifications" onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        {items.length === 0 ? (
          <EmptyState
            icon="notifications-off-outline"
            title="You're all caught up"
            message="No upcoming EMI or subscription reminders. We'll buzz you when something is due."
          />
        ) : (
          items.map((n) => {
            const overdue = n.daysLeft < 0;
            const today = n.daysLeft === 0;
            const tint = overdue || today ? COLORS.negative : n.daysLeft <= 3 ? COLORS.hold : COLORS.primary;
            return (
              <TouchableOpacity
                key={n.id}
                style={[styles.row, { borderLeftColor: tint, borderLeftWidth: 3 }]}
                onPress={() => navigation.getParent()?.navigate('Money', { screen: n.route, params: n.params })}
                activeOpacity={0.85}
              >
                <View style={[styles.iconBox, { backgroundColor: tint + '18' }]}>
                  <Ionicons name={n.kind === 'emi' ? 'cash-outline' : 'calendar-outline'} size={17} color={tint} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>{n.title}</Text>
                  <Text style={styles.body2}>{n.body}</Text>
                </View>
                <Ionicons name="chevron-forward" size={15} color={COLORS.faint} />
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  body: { padding: 18, paddingBottom: 40 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.card, borderRadius: 12, padding: 14,
    borderWidth: 0.5, borderColor: COLORS.hairline, marginBottom: 8,
  },
  iconBox: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 13.5, fontWeight: '800', color: COLORS.text },
  body2: { fontSize: 11.5, color: COLORS.subtext, marginTop: 2 },
});
