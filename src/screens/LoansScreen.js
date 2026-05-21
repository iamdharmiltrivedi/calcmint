import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, MONO_STYLE } from '../constants/colors';
import StorageService from '../services/StorageService';
import NotificationService from '../services/NotificationService';
import { summarizeLoan, totalMonthlyObligation } from '../utils/loans';
import { formatINR, formatINRFull, formatMonths } from '../utils/formatters';

export default function LoansScreen({ navigation }) {
  const [loans, setLoans] = useState([]);

  const load = useCallback(async () => {
    setLoans(await StorageService.getLoans());
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => navigation.addListener('focus', load), [navigation, load]);

  const monthlyTotal = useMemo(() => totalMonthlyObligation(loans), [loans]);
  const upcoming = useMemo(() => {
    return [...loans]
      .map((l) => ({ ...l, _s: summarizeLoan(l) }))
      .filter((x) => !x._s.isClosed)
      .sort((a, b) => (a._s.daysLeft ?? 99) - (b._s.daysLeft ?? 99));
  }, [loans]);

  const onDelete = (loan) => {
    Alert.alert('Delete loan?', `Reminders for ${loan.name} will be cancelled.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const ids = Object.values(loan.notifIds || {}).filter(Boolean);
          await NotificationService.cancelMany(ids);
          const all = await StorageService.getLoans();
          await StorageService.saveLoans(all.filter((l) => l.id !== loan.id));
          load();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Loans</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('LoanEdit', {})}
          style={[styles.iconBtn, { backgroundColor: COLORS.text }]}
        >
          <Ionicons name="add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={COLORS.gradient} style={styles.hero}>
          <Text style={styles.heroLabel}>MONTHLY EMI OBLIGATION</Text>
          <Text style={styles.heroValue}>{formatINRFull(monthlyTotal)}</Text>
          <View style={styles.heroSplit}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroStatLabel}>ACTIVE LOANS</Text>
              <Text style={styles.heroStatValue}>{upcoming.length}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroStatLabel}>NEXT EMI</Text>
              <Text style={styles.heroStatValue}>
                {upcoming[0]?._s.daysLeft != null
                  ? upcoming[0]._s.daysLeft === 0 ? 'Today' : `in ${upcoming[0]._s.daysLeft}d`
                  : '—'}
              </Text>
            </View>
          </View>
        </LinearGradient>

        {loans.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🏦</Text>
            <Text style={styles.emptyTitle}>No loans yet</Text>
            <Text style={styles.emptyHint}>
              Add your loans to see EMI countdowns and get a reminder on each due date.
            </Text>
            <TouchableOpacity
              style={styles.addCta}
              onPress={() => navigation.navigate('LoanEdit', {})}
            >
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={styles.addCtaText}>Add your first loan</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Upcoming</Text>
            {upcoming.map((l) => (
              <LoanRow
                key={l.id}
                loan={l}
                summary={l._s}
                onPress={() => navigation.navigate('LoanEdit', { id: l.id })}
                onLongPress={() => onDelete(l)}
              />
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function LoanRow({ loan, summary, onPress, onLongPress }) {
  const d = summary.daysLeft;
  const dueColor = d == null
    ? COLORS.subtext
    : d < 0 ? COLORS.error
    : d === 0 ? COLORS.error
    : d <= 3 ? COLORS.warning
    : COLORS.subtext;
  const dueLabel = d == null ? '—'
    : d < 0 ? `${-d}d overdue`
    : d === 0 ? 'Due today'
    : `in ${d}d`;

  return (
    <TouchableOpacity
      style={styles.row}
      activeOpacity={0.85}
      onPress={onPress}
      onLongPress={onLongPress}
    >
      <View style={styles.rowIcon}>
        <Ionicons name="cash-outline" size={18} color={COLORS.primary} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.rowName} numberOfLines={1}>{loan.name || 'Untitled loan'}</Text>
        <Text style={styles.rowMeta}>
          {formatINR(summary.emi)} /mo · {formatMonths(summary.remaining)} left
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={[styles.due, { color: dueColor }]}>{dueLabel}</Text>
        <Text style={styles.dueDate}>
          {summary.nextDate
            ? summary.nextDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
            : ''}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
  },
  iconBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 17, fontWeight: '800', color: COLORS.text },

  body: { padding: 18, paddingBottom: 40 },

  hero: { borderRadius: 24, padding: 20, marginBottom: 14 },
  heroLabel: { fontSize: 10.5, fontWeight: '700', letterSpacing: 1.4, color: 'rgba(255,255,255,0.6)' },
  heroValue: { ...MONO_STYLE, fontSize: 32, fontWeight: '700', color: '#fff', marginTop: 6, letterSpacing: -1 },
  heroSplit: {
    flexDirection: 'row', gap: 12, marginTop: 14, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.10)',
  },
  heroStatLabel: { fontSize: 9.5, color: 'rgba(255,255,255,0.55)', fontWeight: '600', letterSpacing: 0.4 },
  heroStatValue: { ...MONO_STYLE, fontSize: 14, fontWeight: '700', color: '#fff', marginTop: 3 },

  sectionTitle: { fontSize: 13, fontWeight: '800', color: COLORS.text, marginTop: 6, marginBottom: 8 },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.card, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: 8,
  },
  rowIcon: {
    width: 38, height: 38, borderRadius: 11,
    backgroundColor: COLORS.primarySoft, alignItems: 'center', justifyContent: 'center',
  },
  rowName: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  rowMeta: { fontSize: 11, color: COLORS.subtext, marginTop: 2 },
  due: { fontSize: 12, fontWeight: '800' },
  dueDate: { fontSize: 10.5, color: COLORS.subtext, fontWeight: '600', marginTop: 2 },

  empty: { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 12 },
  emptyIcon: { fontSize: 38, marginBottom: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  emptyHint: { fontSize: 12, color: COLORS.subtext, marginTop: 4, textAlign: 'center', lineHeight: 18 },
  addCta: {
    marginTop: 18, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.text, paddingHorizontal: 18, height: 46, borderRadius: 14,
  },
  addCtaText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
