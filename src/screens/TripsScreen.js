import React, { useEffect, useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, MONO_STYLE } from '../constants/colors';
import StorageService from '../services/StorageService';
import { useApp } from '../context/AppContext';
import { formatINR } from '../utils/formatters';

const fmtDateShort = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return '';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
};

const formatDateRange = (start, end) => {
  if (!start && !end) return 'No dates';
  if (start && end) return `${fmtDateShort(start)} → ${fmtDateShort(end)}`;
  return fmtDateShort(start || end);
};

export default function TripsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { expenses } = useApp();
  const [trips, setTrips] = useState([]);
  const [receipts, setReceipts] = useState([]);

  useEffect(() => {
    Promise.all([StorageService.getTrips(), StorageService.getReceipts()])
      .then(([t, r]) => { setTrips(t); setReceipts(r); });
  }, []);

  useEffect(() => {
    const focus = navigation.addListener('focus', () => {
      Promise.all([StorageService.getTrips(), StorageService.getReceipts()])
        .then(([t, r]) => { setTrips(t); setReceipts(r); });
    });
    return focus;
  }, [navigation]);

  const stats = useMemo(() => {
    const map = {};
    for (const t of trips) {
      const spent = expenses
        .filter((e) => e.tripId === t.id)
        .reduce((s, e) => s + (Number(e.amount) || 0), 0);
      const docCount = receipts.filter((r) => r.folderId === t.folderId).length;
      map[t.id] = { spent, docCount };
    }
    return map;
  }, [trips, expenses, receipts]);

  const deleteTrip = (trip) => {
    Alert.alert(
      `Delete "${trip.name}"?`,
      'The trip is removed. Linked documents and expenses are kept but no longer marked as belonging to this trip.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const nextTrips = trips.filter((t) => t.id !== trip.id);
            setTrips(nextTrips);
            await StorageService.saveTrips(nextTrips);

            // Unlink the doc folder (drop the tripId marker, keep the folder).
            const folders = await StorageService.getDocFolders();
            await StorageService.saveDocFolders(
              folders.map((f) => (f.id === trip.folderId ? { ...f, tripId: null } : f)),
            );

            // Unlink expenses — keep them, drop the tripId tag.
            const allExpenses = await StorageService.getExpenses();
            await StorageService.saveExpenses(
              allExpenses.map((e) => (e.tripId === trip.id ? { ...e, tripId: null } : e)),
            );
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>Trips</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('AddTrip')}
          style={[styles.iconBtn, { backgroundColor: COLORS.text }]}
        >
          <Ionicons name="add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.body, { paddingBottom: 32 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {trips.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🧳</Text>
            <Text style={styles.emptyTitle}>No trips yet</Text>
            <Text style={styles.emptyHint}>
              Create a trip like "Singapore" to keep documents and expenses for it in one place.
            </Text>
            <TouchableOpacity
              style={styles.cta}
              onPress={() => navigation.navigate('AddTrip')}
              activeOpacity={0.9}
            >
              <Ionicons name="add" size={16} color="#fff" />
              <Text style={styles.ctaText}>New trip</Text>
            </TouchableOpacity>
          </View>
        ) : (
          trips.map((t) => {
            const s = stats[t.id] || { spent: 0, docCount: 0 };
            const budget = Number(t.budget) || 0;
            const overBudget = budget > 0 && s.spent > budget;
            return (
              <TouchableOpacity
                key={t.id}
                style={styles.card}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('TripDetail', { id: t.id })}
                onLongPress={() => deleteTrip(t)}
              >
                <View style={styles.cardTop}>
                  <View style={styles.cardIcon}>
                    <Ionicons name="airplane" size={18} color={COLORS.primary} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.cardName} numberOfLines={1}>{t.name}</Text>
                    <Text style={styles.cardSub} numberOfLines={1}>
                      {t.destination ? `${t.destination} · ` : ''}{formatDateRange(t.startDate, t.endDate)}
                    </Text>
                  </View>
                </View>
                <View style={styles.statRow}>
                  <Stat label="SPENT" value={formatINR(s.spent)} accent={overBudget ? COLORS.error : undefined} />
                  <Stat
                    label={budget > 0 ? 'BUDGET' : 'DOCS'}
                    value={budget > 0 ? formatINR(budget) : `${s.docCount}`}
                  />
                  <Stat label="DOCS" value={`${s.docCount}`} />
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value, accent }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, accent && { color: accent }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
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
  title: { fontSize: 17, fontWeight: '800', color: COLORS.text, flex: 1, textAlign: 'center', marginHorizontal: 8 },

  body: { padding: 18, gap: 12 },

  empty: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 12 },
  emptyIcon: { fontSize: 42, marginBottom: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  emptyHint: { fontSize: 12, color: COLORS.subtext, marginTop: 6, textAlign: 'center', lineHeight: 18 },
  cta: {
    marginTop: 18, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.text, paddingHorizontal: 18, height: 46, borderRadius: 14,
  },
  ctaText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  card: {
    backgroundColor: COLORS.card, borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: COLORS.border,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardIcon: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: COLORS.primarySoft, alignItems: 'center', justifyContent: 'center',
  },
  cardName: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  cardSub: { fontSize: 12, color: COLORS.subtext, marginTop: 2 },

  statRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  statBox: {
    flex: 1, backgroundColor: COLORS.background, borderRadius: 12, padding: 10,
    borderWidth: 1, borderColor: COLORS.border,
  },
  statLabel: { fontSize: 9, color: COLORS.subtext, fontWeight: '800', letterSpacing: 0.5 },
  statValue: { ...MONO_STYLE, fontSize: 13, fontWeight: '800', color: COLORS.text, marginTop: 4 },
});
