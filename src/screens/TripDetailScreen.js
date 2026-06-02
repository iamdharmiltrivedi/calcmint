import React, { useEffect, useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, MONO_STYLE } from '../constants/colors';
import StorageService from '../services/StorageService';
import { useApp } from '../context/AppContext';
import { EXPENSE_CATEGORIES } from '../constants/categories';
import { DOC_KINDS } from '../constants/documentKinds';
import { formatINR, formatINRFull } from '../utils/formatters';

const fmtDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return '';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const dateRange = (start, end) => {
  if (!start && !end) return 'Dates not set';
  if (start && end) return `${fmtDate(start)} → ${fmtDate(end)}`;
  return fmtDate(start || end);
};

export default function TripDetailScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { id } = route.params;
  const { expenses, removeExpense } = useApp();
  const [trip, setTrip] = useState(null);
  const [receipts, setReceipts] = useState([]);

  useEffect(() => {
    Promise.all([StorageService.getTrips(), StorageService.getReceipts()])
      .then(([trips, recs]) => {
        setTrip(trips.find((x) => x.id === id) || null);
        setReceipts(recs);
      });
  }, [id]);

  useEffect(() => {
    const focus = navigation.addListener('focus', () => {
      Promise.all([StorageService.getTrips(), StorageService.getReceipts()])
        .then(([trips, recs]) => {
          setTrip(trips.find((x) => x.id === id) || null);
          setReceipts(recs);
        });
    });
    return focus;
  }, [navigation, id]);

  const tripDocs = useMemo(
    () => (trip ? receipts.filter((r) => r.folderId === trip.folderId) : []),
    [trip, receipts],
  );

  const tripExpenses = useMemo(
    () => expenses.filter((e) => e.tripId === id),
    [expenses, id],
  );

  const spent = useMemo(
    () => tripExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0),
    [tripExpenses],
  );

  const budget = Number(trip?.budget) || 0;
  const remaining = budget > 0 ? budget - spent : null;

  const onDelete = () => {
    if (!trip) return;
    Alert.alert(
      `Delete "${trip.name}"?`,
      'The trip is removed. Linked documents and expenses are kept but no longer marked as belonging to this trip.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const trips = await StorageService.getTrips();
            await StorageService.saveTrips(trips.filter((t) => t.id !== id));

            const folders = await StorageService.getDocFolders();
            await StorageService.saveDocFolders(
              folders.map((f) => (f.id === trip.folderId ? { ...f, tripId: null } : f)),
            );

            const allExpenses = await StorageService.getExpenses();
            await StorageService.saveExpenses(
              allExpenses.map((e) => (e.tripId === id ? { ...e, tripId: null } : e)),
            );

            navigation.goBack();
          },
        },
      ],
    );
  };

  const onAddDoc = () => {
    if (!trip) return;
    navigation.navigate('Receipts', { folderId: trip.folderId });
  };

  const onAddExpense = () => {
    if (!trip) return;
    navigation.navigate('AddExpense', { tripId: trip.id });
  };

  const onDeleteExpense = (expId) =>
    Alert.alert('Delete expense?', '', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => removeExpense(expId) },
    ]);

  if (!trip) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={{ padding: 24, color: COLORS.subtext }}>Loading…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{trip.name}</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            onPress={() => navigation.navigate('AddTrip', { id: trip.id })}
            style={styles.iconBtn}
          >
            <Ionicons name="create-outline" size={18} color={COLORS.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onDelete} style={[styles.iconBtn, { backgroundColor: '#FCE6EC' }]}>
            <Ionicons name="trash-outline" size={18} color={COLORS.error} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.body, { paddingBottom: 32 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.meta}>
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={14} color={COLORS.subtext} />
            <Text style={styles.metaText} numberOfLines={1}>
              {trip.destination || 'No destination set'}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={14} color={COLORS.subtext} />
            <Text style={styles.metaText}>{dateRange(trip.startDate, trip.endDate)}</Text>
          </View>
          {trip.notes ? (
            <Text style={styles.notes}>{trip.notes}</Text>
          ) : null}
        </View>

        <View style={styles.statRow}>
          <Stat label="SPENT" value={formatINR(spent)} />
          {budget > 0 ? (
            <>
              <Stat label="BUDGET" value={formatINR(budget)} />
              <Stat
                label={remaining >= 0 ? 'REMAINING' : 'OVER'}
                value={formatINR(Math.abs(remaining))}
                accent={remaining < 0 ? COLORS.error : COLORS.primary}
              />
            </>
          ) : (
            <Stat label="DOCS" value={`${tripDocs.length}`} />
          )}
        </View>

        {/* ── Documents ───────────────────────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Documents</Text>
          <TouchableOpacity onPress={onAddDoc} style={styles.addBtn} activeOpacity={0.85}>
            <Ionicons name="add" size={14} color="#fff" />
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        </View>

        {tripDocs.length === 0 ? (
          <View style={styles.placeholder}>
            <Ionicons name="document-text-outline" size={28} color={COLORS.faint} />
            <Text style={styles.placeholderText}>
              Tickets, hotel bookings, visa, insurance — all here.
            </Text>
            <TouchableOpacity onPress={onAddDoc} style={styles.placeholderCta} activeOpacity={0.85}>
              <Text style={styles.placeholderCtaText}>Add document</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.docGrid}>
            {tripDocs.map((r) => {
              const kindCfg = DOC_KINDS[r.kind] || DOC_KINDS.receipt;
              const isImage = !r.mimeType || /^image\//i.test(r.mimeType);
              const isPdf = /pdf/i.test(r.mimeType || '') || /\.pdf$/i.test(r.imageUri || '');
              return (
                <TouchableOpacity
                  key={r.id}
                  style={styles.docTile}
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate('ReceiptDetail', { id: r.id })}
                >
                  {isImage ? (
                    <Image source={{ uri: r.imageUri }} style={styles.docImg} resizeMode="cover" />
                  ) : (
                    <View style={[styles.docImg, styles.docFile, { backgroundColor: kindCfg.soft }]}>
                      <Ionicons
                        name={isPdf ? 'document-text' : 'document-attach'}
                        size={36}
                        color={kindCfg.color}
                      />
                      <Text style={[styles.docFileLabel, { color: kindCfg.color }]} numberOfLines={1}>
                        {isPdf ? 'PDF' : (r.fileName || 'File')}
                      </Text>
                    </View>
                  )}
                  <Text style={styles.docName} numberOfLines={1}>
                    {r.vendor || kindCfg.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* ── Expenses ────────────────────────────────────────────────── */}
        <View style={[styles.sectionHeader, { marginTop: 22 }]}>
          <Text style={styles.sectionTitle}>Expenses</Text>
          <TouchableOpacity onPress={onAddExpense} style={styles.addBtn} activeOpacity={0.85}>
            <Ionicons name="add" size={14} color="#fff" />
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        </View>

        {tripExpenses.length === 0 ? (
          <View style={styles.placeholder}>
            <Ionicons name="cash-outline" size={28} color={COLORS.faint} />
            <Text style={styles.placeholderText}>
              Log meals, transport and shopping you did on this trip.
            </Text>
            <TouchableOpacity onPress={onAddExpense} style={styles.placeholderCta} activeOpacity={0.85}>
              <Text style={styles.placeholderCtaText}>Add expense</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ gap: 8 }}>
            {tripExpenses.map((e) => {
              const cat = EXPENSE_CATEGORIES.find((c) => c.id === e.categoryId) || EXPENSE_CATEGORIES[0];
              return (
                <TouchableOpacity
                  key={e.id}
                  style={styles.expRow}
                  activeOpacity={0.85}
                  onLongPress={() => onDeleteExpense(e.id)}
                >
                  <View style={[styles.expIcon, { backgroundColor: cat.color + '22' }]}>
                    <Text style={{ fontSize: 14 }}>{cat.emoji}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.expTitle} numberOfLines={1}>
                      {e.note || cat.label}
                    </Text>
                    <Text style={styles.expSub} numberOfLines={1}>
                      {cat.label} · {fmtDate(e.date)}
                    </Text>
                  </View>
                  <Text style={styles.expAmount}>{formatINRFull(Number(e.amount) || 0)}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
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

  body: { padding: 18 },

  meta: {
    backgroundColor: COLORS.card, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: COLORS.border, gap: 6, marginBottom: 14,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaText: { fontSize: 13, color: COLORS.text, fontWeight: '600', flex: 1 },
  notes: { fontSize: 12, color: COLORS.subtext, lineHeight: 17, marginTop: 6 },

  statRow: { flexDirection: 'row', gap: 8, marginBottom: 18 },
  statBox: {
    flex: 1, backgroundColor: COLORS.card, borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: COLORS.border,
  },
  statLabel: { fontSize: 9, color: COLORS.subtext, fontWeight: '800', letterSpacing: 0.5 },
  statValue: { ...MONO_STYLE, fontSize: 15, fontWeight: '800', color: COLORS.text, marginTop: 4 },

  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: COLORS.text },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.text, paddingHorizontal: 10, height: 30, borderRadius: 10,
  },
  addBtnText: { color: '#fff', fontSize: 12, fontWeight: '800' },

  placeholder: {
    backgroundColor: COLORS.card, borderRadius: 14, padding: 18,
    borderWidth: 1, borderColor: COLORS.border, alignItems: 'center',
  },
  placeholderText: {
    fontSize: 12, color: COLORS.subtext, textAlign: 'center',
    marginTop: 8, lineHeight: 17,
  },
  placeholderCta: {
    marginTop: 12, paddingHorizontal: 14, height: 34, borderRadius: 10,
    backgroundColor: COLORS.primarySoft, justifyContent: 'center',
  },
  placeholderCtaText: { color: COLORS.primary, fontSize: 12, fontWeight: '800' },

  docGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  docTile: {
    width: '48%', backgroundColor: COLORS.card, borderRadius: 14,
    borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden',
  },
  docImg: { width: '100%', aspectRatio: 1, backgroundColor: '#E8EBE7' },
  docFile: { alignItems: 'center', justifyContent: 'center', gap: 6, padding: 10 },
  docFileLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  docName: {
    fontSize: 12, fontWeight: '700', color: COLORS.text,
    paddingHorizontal: 10, paddingVertical: 8,
  },

  expRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: COLORS.card, borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: COLORS.border,
  },
  expIcon: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  expTitle: { fontSize: 13, fontWeight: '800', color: COLORS.text },
  expSub: { fontSize: 11, color: COLORS.subtext, marginTop: 2 },
  expAmount: { ...MONO_STYLE, fontSize: 13, fontWeight: '800', color: COLORS.text },
});
