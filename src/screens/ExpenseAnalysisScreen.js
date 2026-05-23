import React, { useMemo, useState } from 'react';
import {
  View, Text, SectionList, StyleSheet, TouchableOpacity,
  TextInput, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, MONO_STYLE } from '../constants/colors';
import { EXPENSE_CATEGORIES } from '../constants/categories';
import DonutChart from '../components/DonutChart';
import BrandHeader from '../components/BrandHeader';
import { useApp } from '../context/AppContext';
import { formatINR, formatINRFull } from '../utils/formatters';
import FAB from '../components/ui/FAB';
import BottomSheet from '../components/ui/BottomSheet';
import EmptyState from '../components/ui/EmptyState';

const today = () => new Date().toISOString().split('T')[0];
const monthKey = (e) => (e.date || e.createdAt || '').slice(0, 7);
const thisMonthKey = () => new Date().toISOString().slice(0, 7);
const monthShort = (key) => {
  if (!key) return '';
  const [y, m] = key.split('-');
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleString('en-IN', { month: 'short' });
};

// Date label for the sticky section headers in the transaction list.
const dateLabel = (iso) => {
  if (!iso) return '';
  const d = new Date(iso); d.setHours(0, 0, 0, 0);
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const diff = Math.round((now - d) / 86400000);
  if (diff === 0)  return 'Today';
  if (diff === 1)  return 'Yesterday';
  if (diff < 7)    return d.toLocaleDateString('en-IN', { weekday: 'long' });
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: now.getFullYear() === d.getFullYear() ? undefined : 'numeric' });
};

const EMPTY_FORM = { amount: '', categoryId: 'food', note: '', date: today() };

export default function ExpenseAnalysisScreen() {
  const insets = useSafeAreaInsets();
  const { expenses, addExpense, removeExpense } = useApp();
  const [selectedMonth, setSelectedMonth] = useState(thisMonthKey());
  const [sheetVisible, setSheetVisible] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  // ── Month groups for switcher ────────────────────────────────────────
  const monthKeys = useMemo(() => {
    const set = new Set();
    for (const e of expenses) { const k = monthKey(e); if (k) set.add(k); }
    set.add(thisMonthKey());
    return Array.from(set).sort().reverse();
  }, [expenses]);

  const monthExpenses = useMemo(
    () => expenses.filter((e) => monthKey(e) === selectedMonth),
    [expenses, selectedMonth],
  );

  const monthTotal = useMemo(
    () => monthExpenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0),
    [monthExpenses],
  );

  // Category bars: name, amount, % of total. Sorted by amount desc.
  const categoryBars = useMemo(() => {
    const byId = new Map();
    for (const e of monthExpenses) {
      const cur = byId.get(e.categoryId) || 0;
      byId.set(e.categoryId, cur + parseFloat(e.amount || 0));
    }
    return EXPENSE_CATEGORIES
      .map((cat) => ({ ...cat, value: byId.get(cat.id) || 0 }))
      .filter((c) => c.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [monthExpenses]);

  // Group transactions by ISO date for SectionList. Sticky day headers.
  const sections = useMemo(() => {
    const map = new Map();
    for (const e of monthExpenses) {
      const d = (e.date || e.createdAt || '').slice(0, 10);
      if (!map.has(d)) map.set(d, []);
      map.get(d).push(e);
    }
    return Array.from(map.entries())
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([d, list]) => ({
        title: d,
        label: dateLabel(d),
        data: list.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
      }));
  }, [monthExpenses]);

  const getCat = (id) => EXPENSE_CATEGORIES.find((c) => c.id === id) || EXPENSE_CATEGORIES.at(-1);

  const openSheet = () => {
    setForm({ ...EMPTY_FORM, date: selectedMonth === thisMonthKey() ? today() : `${selectedMonth}-01` });
    setSheetVisible(true);
  };

  const handleAdd = async () => {
    const amt = parseFloat(form.amount);
    if (!amt || amt <= 0) return Alert.alert('Enter a valid amount');
    await addExpense({
      amount: amt, categoryId: form.categoryId,
      note: form.note.trim(), date: form.date || today(),
    });
    if (form.date) setSelectedMonth(form.date.slice(0, 7));
    setForm(EMPTY_FORM);
    setSheetVisible(false);
  };

  const confirmDelete = (id, note) => {
    Alert.alert('Delete expense', `Remove “${note || 'this expense'}”?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => removeExpense(id) },
    ]);
  };

  // ── Renderers ────────────────────────────────────────────────────────
  const HeaderBlock = () => (
    <>
      {/* Month switcher chips */}
      <View style={styles.monthChips}>
        {monthKeys.slice(0, 6).map((k) => {
          const sel = k === selectedMonth;
          return (
            <TouchableOpacity
              key={k}
              style={[styles.monthChip, sel && styles.monthChipActive]}
              onPress={() => setSelectedMonth(k)}
              activeOpacity={0.85}
            >
              <Text style={[styles.monthChipText, sel && { color: '#fff' }]}>
                {monthShort(k)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Donut chart with center total */}
      {categoryBars.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Spending breakdown</Text>
          <View style={styles.donutWrap}>
            <DonutChart
              data={categoryBars.map((c) => ({
                label: `${c.emoji} ${c.label}`,
                value: c.value,
                color: c.color,
              }))}
              size={200}
            />
            {/* Overlay center text — DonutChart hides label when we pass centerValue, but adding our own overlay guarantees consistent typography. */}
            <View style={styles.donutCenter} pointerEvents="none">
              <Text style={styles.donutCenterLabel}>TOTAL SPENT</Text>
              <Text style={styles.donutCenterValue}>{formatINRFull(monthTotal)}</Text>
              <Text style={styles.donutCenterSub}>{monthShort(selectedMonth)} · {monthExpenses.length} txns</Text>
            </View>
          </View>

          {/* Horizontal category bars */}
          <View style={{ marginTop: 18, gap: 12 }}>
            {categoryBars.map((c) => {
              const pct = (c.value / monthTotal) * 100;
              return (
                <View key={c.id}>
                  <View style={styles.barHead}>
                    <View style={styles.barLabelRow}>
                      <Text style={styles.barEmoji}>{c.emoji}</Text>
                      <Text style={styles.barLabel} numberOfLines={1}>{c.label}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                      <Text style={styles.barPct}>{pct.toFixed(0)}%</Text>
                      <Text style={styles.barAmt}>{formatINR(c.value)}</Text>
                    </View>
                  </View>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { width: `${Math.max(2, pct)}%`, backgroundColor: c.color }]} />
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      ) : null}

      {sections.length > 0 && (
        <Text style={[styles.sectionLabel, { marginTop: 18, marginBottom: 4 }]}>Transactions</Text>
      )}
    </>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <BrandHeader />

      <View style={styles.pageHead}>
        <View>
          <Text style={styles.pageTitle}>Finance</Text>
          <Text style={styles.pageSub}>{monthShort(selectedMonth)} · {formatINRFull(monthTotal)}</Text>
        </View>
      </View>

      {monthExpenses.length === 0 ? (
        <>
          <HeaderBlock />
          <EmptyState
            emoji="💸"
            title={`No expenses in ${monthShort(selectedMonth)}`}
            message="Tap the + button to log your first transaction for this month."
            ctaLabel="Add expense"
            onCtaPress={openSheet}
            style={{ marginTop: 20 }}
          />
        </>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={HeaderBlock}
          contentContainerStyle={[styles.body, { paddingBottom: 100 + insets.bottom }]}
          stickySectionHeadersEnabled
          renderSectionHeader={({ section }) => (
            <View style={styles.sticky}>
              <Text style={styles.stickyText}>{section.label}</Text>
              <Text style={styles.stickyAmt}>
                {formatINR(section.data.reduce((s, e) => s + parseFloat(e.amount || 0), 0))}
              </Text>
            </View>
          )}
          renderItem={({ item }) => {
            const cat = getCat(item.categoryId);
            return (
              <View style={styles.expRow}>
                <View style={[styles.expIcon, { backgroundColor: cat.color + '20' }]}>
                  <Text style={{ fontSize: 16 }}>{cat.emoji}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.expNote} numberOfLines={1}>{item.note || cat.label}</Text>
                  <Text style={styles.expMeta}>{cat.label}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 6 }}>
                  <Text style={styles.expAmt}>{formatINR(item.amount)}</Text>
                  <TouchableOpacity
                    onPress={() => confirmDelete(item.id, item.note)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="trash-outline" size={14} color={COLORS.negative} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* Emerald FAB */}
      <FAB icon="add" onPress={openSheet} bottom={20 + insets.bottom} />

      {/* Add-expense bottom sheet */}
      <BottomSheet visible={sheetVisible} onClose={() => setSheetVisible(false)} title="Add expense">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Text style={styles.sheetLabel}>Amount</Text>
          <View style={styles.sheetField}>
            <Text style={styles.sheetPrefix}>₹</Text>
            <TextInput
              style={styles.sheetInput}
              value={form.amount}
              onChangeText={(v) => setForm({ ...form, amount: v })}
              placeholder="0"
              placeholderTextColor={COLORS.faint}
              keyboardType="numeric"
              autoFocus
            />
          </View>

          <Text style={[styles.sheetLabel, { marginTop: 14 }]}>Date</Text>
          <View style={styles.sheetField}>
            <TextInput
              style={styles.sheetInput}
              value={form.date}
              onChangeText={(v) => setForm({ ...form, date: v })}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={COLORS.faint}
              maxLength={10}
            />
          </View>

          <Text style={[styles.sheetLabel, { marginTop: 14 }]}>Category</Text>
          <View style={styles.catGrid}>
            {EXPENSE_CATEGORIES.map((cat) => {
              const sel = form.categoryId === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.catChip, sel && { backgroundColor: cat.color, borderColor: cat.color }]}
                  onPress={() => setForm({ ...form, categoryId: cat.id })}
                >
                  <Text style={{ fontSize: 13 }}>{cat.emoji}</Text>
                  <Text style={[styles.catChipText, sel && { color: '#fff' }]}>{cat.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.sheetLabel, { marginTop: 14 }]}>Note (optional)</Text>
          <View style={styles.sheetField}>
            <TextInput
              style={styles.sheetInput}
              value={form.note}
              onChangeText={(v) => setForm({ ...form, note: v })}
              placeholder="What was this for?"
              placeholderTextColor={COLORS.faint}
            />
          </View>

          <TouchableOpacity style={styles.sheetCta} onPress={handleAdd} activeOpacity={0.9}>
            <Text style={styles.sheetCtaText}>Add ₹{form.amount || '0'}</Text>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  body: { padding: 18 },

  pageHead: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 6 },
  pageTitle: { fontSize: 24, fontWeight: '800', color: COLORS.text, letterSpacing: -0.4 },
  pageSub:   { fontSize: 12, color: COLORS.subtext, fontWeight: '700', marginTop: 2 },

  monthChips: { flexDirection: 'row', gap: 6, marginTop: 8, marginBottom: 4 },
  monthChip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999,
    backgroundColor: COLORS.card, borderWidth: 0.5, borderColor: COLORS.hairline,
  },
  monthChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  monthChipText: { fontSize: 11.5, fontWeight: '800', color: COLORS.subtext },

  card: {
    backgroundColor: COLORS.card, borderRadius: 12, padding: 16,
    borderWidth: 0.5, borderColor: COLORS.hairline, marginTop: 14,
  },
  sectionLabel: { fontSize: 11, fontWeight: '800', color: '#888888', letterSpacing: 0.66, textTransform: 'uppercase', marginBottom: 10 },

  donutWrap: { alignItems: 'center', justifyContent: 'center', position: 'relative' },
  donutCenter: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center' },
  donutCenterLabel: { fontSize: 9, color: '#888888', fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase' },
  donutCenterValue: { ...MONO_STYLE, fontSize: 18, fontWeight: '800', color: COLORS.text, marginTop: 2, letterSpacing: -0.5 },
  donutCenterSub:   { fontSize: 10, color: COLORS.subtext, fontWeight: '700', marginTop: 2 },

  barHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 },
  barLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1, maxWidth: '60%' },
  barEmoji: { fontSize: 14 },
  barLabel: { fontSize: 12.5, fontWeight: '700', color: COLORS.text },
  barPct:   { ...MONO_STYLE, fontSize: 10.5, color: COLORS.subtext, fontWeight: '800' },
  barAmt:   { ...MONO_STYLE, fontSize: 13, color: COLORS.text, fontWeight: '800' },
  barTrack: { height: 8, backgroundColor: '#F0F2EF', borderRadius: 999, overflow: 'hidden' },
  barFill:  { height: 8, borderRadius: 999 },

  sticky: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline',
    backgroundColor: COLORS.background,
    paddingHorizontal: 18, paddingVertical: 8,
    borderBottomWidth: 0.5, borderBottomColor: COLORS.hairline,
  },
  stickyText: { fontSize: 11, fontWeight: '800', color: '#888888', letterSpacing: 0.66, textTransform: 'uppercase' },
  stickyAmt:  { ...MONO_STYLE, fontSize: 12, fontWeight: '800', color: COLORS.subtext },

  expRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.card,
    marginHorizontal: 18, marginTop: 8,
    padding: 14, borderRadius: 12,
    borderWidth: 0.5, borderColor: COLORS.hairline,
  },
  expIcon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  expNote: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  expMeta: { fontSize: 11, color: COLORS.subtext, marginTop: 2 },
  expAmt:  { ...MONO_STYLE, fontSize: 14, fontWeight: '800', color: COLORS.text },

  // Bottom sheet form (shared style)
  sheetLabel:  { fontSize: 11, fontWeight: '800', color: '#888888', letterSpacing: 0.66, textTransform: 'uppercase', marginBottom: 6 },
  sheetField:  {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.background, borderRadius: 12,
    paddingHorizontal: 14, height: 50,
    borderWidth: 0.5, borderColor: COLORS.hairline,
  },
  sheetPrefix: { fontSize: 15, color: COLORS.subtext, marginRight: 6, fontWeight: '700' },
  sheetInput:  { flex: 1, fontSize: 15, color: COLORS.text, fontWeight: '700' },
  sheetCta:    { marginTop: 18, backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  sheetCtaText:{ color: '#fff', fontWeight: '800', fontSize: 14 },

  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 7,
    borderRadius: 999, borderWidth: 0.5, borderColor: COLORS.hairline,
    backgroundColor: COLORS.background,
  },
  catChipText: { fontSize: 11.5, fontWeight: '700', color: COLORS.text },
});
