import React, { useMemo, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Modal, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { EXPENSE_CATEGORIES } from '../constants/categories';
import DonutChart from '../components/DonutChart';
import AdBanner from '../components/AdBanner';
import BrandHeader from '../components/BrandHeader';
import { useApp } from '../context/AppContext';
import { formatINR, formatINRFull } from '../utils/formatters';

const today = () => new Date().toISOString().split('T')[0];
const monthKey = (e) => (e.date || e.createdAt || '').slice(0, 7);
const thisMonthKey = () => new Date().toISOString().slice(0, 7);

const monthLabel = (key) => {
  if (!key) return '';
  const [y, m] = key.split('-');
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
};

const monthShort = (key) => {
  if (!key) return '';
  const [y, m] = key.split('-');
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleString('en-IN', { month: 'short' });
};

const EMPTY_FORM = { amount: '', categoryId: 'food', note: '', date: today() };

export default function ExpenseAnalysisScreen() {
  const insets = useSafeAreaInsets();
  const { expenses, addExpense, removeExpense } = useApp();

  // null = month list view; "YYYY-MM" = month detail view
  const [selectedMonth, setSelectedMonth] = useState(thisMonthKey());
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErr, setFormErr] = useState({});

  // Group all expenses by YYYY-MM (newest first)
  const monthGroups = useMemo(() => {
    const map = new Map();
    for (const e of expenses) {
      const k = monthKey(e);
      if (!k) continue;
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(e);
    }
    const arr = Array.from(map.entries()).map(([k, list]) => ({
      key: k,
      list,
      total: list.reduce((s, e) => s + parseFloat(e.amount || 0), 0),
    }));
    arr.sort((a, b) => (a.key < b.key ? 1 : -1));
    return arr;
  }, [expenses]);

  const currentGroup = useMemo(
    () => monthGroups.find((g) => g.key === selectedMonth) || { key: selectedMonth, list: [], total: 0 },
    [monthGroups, selectedMonth],
  );

  const categoryTotals = useMemo(() =>
    EXPENSE_CATEGORIES.map((cat) => {
      const total = currentGroup.list
        .filter((e) => e.categoryId === cat.id)
        .reduce((s, e) => s + parseFloat(e.amount || 0), 0);
      return { ...cat, value: total };
    }).filter((c) => c.value > 0),
  [currentGroup]);

  const setField = (key) => (val) => setForm((p) => ({ ...p, [key]: val }));

  const validateForm = () => {
    const e = {};
    const amt = parseFloat(form.amount);
    if (!amt || amt <= 0 || amt > 10_000_000) e.amount = 'Enter a valid amount';
    setFormErr(e);
    return Object.keys(e).length === 0;
  };

  const openAdd = () => {
    // Pre-fill date to the 1st of the selected month if it's not the current one,
    // so users can backfill historical data without re-typing the date.
    const defaultDate =
      selectedMonth === thisMonthKey() ? today() : `${selectedMonth}-01`;
    setForm({ ...EMPTY_FORM, date: defaultDate });
    setFormErr({});
    setModalVisible(true);
  };

  const handleAdd = async () => {
    if (!validateForm()) return;
    await addExpense({
      amount:     parseFloat(form.amount),
      categoryId: form.categoryId,
      note:       form.note.trim(),
      date:       form.date || today(),
    });
    // Jump the view to whichever month the new expense belongs to,
    // so users immediately see what they just added.
    if (form.date) setSelectedMonth(form.date.slice(0, 7));
    setForm(EMPTY_FORM);
    setModalVisible(false);
  };

  const confirmDelete = (id, note) => {
    Alert.alert(
      'Delete Expense',
      `Remove "${note || 'this expense'}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => removeExpense(id) },
      ],
    );
  };

  const getCat = (id) => EXPENSE_CATEGORIES.find((c) => c.id === id) || EXPENSE_CATEGORIES.at(-1);

  const inDetail = selectedMonth != null;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <BrandHeader />

      {/* Header hero */}
      <LinearGradient colors={COLORS.gradient} style={styles.header}>
        <View style={styles.headerOrb} />
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Expense Tracker</Text>
            <Text style={styles.headerSub}>
              {inDetail ? monthLabel(selectedMonth) : 'All months'}
            </Text>
          </View>

          {inDetail && monthGroups.length > 1 && (
            <TouchableOpacity
              style={styles.ghostBtn}
              onPress={() => setSelectedMonth(null)}
            >
              <Ionicons name="calendar-outline" size={16} color="#fff" />
              <Text style={styles.ghostBtnText}>Months</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
            <Ionicons name="add" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.totalBox}>
          <Text style={styles.totalLabel}>
            {inDetail ? 'Total Spent This Month' : 'Lifetime Total'}
          </Text>
          <Text style={styles.totalAmount}>
            {formatINRFull(
              inDetail
                ? currentGroup.total
                : monthGroups.reduce((s, g) => s + g.total, 0),
            )}
          </Text>
        </View>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.body, { paddingBottom: 32 + insets.bottom }]}
      >
        {!inDetail ? (
          // ── Month list ─────────────────────────────────────────────────
          monthGroups.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>💸</Text>
              <Text style={styles.emptyTitle}>No expenses yet</Text>
              <Text style={styles.emptySub}>Tap + to add your first expense</Text>
            </View>
          ) : (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Months</Text>
              {monthGroups.map((g) => (
                <TouchableOpacity
                  key={g.key}
                  style={styles.monthRow}
                  activeOpacity={0.85}
                  onPress={() => setSelectedMonth(g.key)}
                >
                  <View style={styles.monthBadge}>
                    <Text style={styles.monthBadgeText}>{monthShort(g.key)}</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.monthName}>{monthLabel(g.key)}</Text>
                    <Text style={styles.monthMeta}>{g.list.length} transaction{g.list.length === 1 ? '' : 's'}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.monthAmount}>{formatINR(g.total)}</Text>
                    <Ionicons name="chevron-forward" size={16} color={COLORS.faint} />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )
        ) : (
          // ── Month detail ───────────────────────────────────────────────
          <>
            {categoryTotals.length > 0 ? (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Spending Breakdown</Text>
                <DonutChart
                  data={categoryTotals.map((c) => ({
                    label: c.emoji + ' ' + c.label,
                    value: c.value,
                    color: c.color,
                  }))}
                  centerValue={currentGroup.total}
                  centerLabel={monthShort(selectedMonth)}
                  size={200}
                />
              </View>
            ) : (
              <View style={styles.empty}>
                <Text style={styles.emptyIcon}>💸</Text>
                <Text style={styles.emptyTitle}>Nothing in {monthShort(selectedMonth)}</Text>
                <Text style={styles.emptySub}>Tap + to add an expense for this month</Text>
              </View>
            )}

            {currentGroup.list.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>
                  Transactions ({currentGroup.list.length})
                </Text>
                {currentGroup.list.map((item) => {
                  const cat = getCat(item.categoryId);
                  return (
                    <View key={item.id} style={styles.expRow}>
                      <View style={[styles.expIcon, { backgroundColor: cat.color + '20' }]}>
                        <Text style={styles.expEmoji}>{cat.emoji}</Text>
                      </View>
                      <View style={styles.expBody}>
                        <Text style={styles.expNote} numberOfLines={1}>
                          {item.note || cat.label}
                        </Text>
                        <Text style={styles.expMeta}>
                          {cat.label}  ·  {item.date || item.createdAt?.slice(0, 10) || ''}
                        </Text>
                      </View>
                      <View style={styles.expRight}>
                        <Text style={styles.expAmt}>{formatINR(item.amount)}</Text>
                        <TouchableOpacity
                          onPress={() => confirmDelete(item.id, item.note)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons name="trash-outline" size={15} color={COLORS.error} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </>
        )}

        <AdBanner style={{ marginTop: 18 }} />
      </ScrollView>

      {/* ── Add Expense Modal ──────────────────────────────────────────── */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.modal} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Expense</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">

              <Text style={styles.fieldLabel}>Amount</Text>
              <View style={[styles.fieldRow, formErr.amount && styles.fieldErr]}>
                <Text style={styles.prefix}>₹</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={form.amount}
                  onChangeText={setField('amount')}
                  placeholder="0"
                  placeholderTextColor={COLORS.border}
                  keyboardType="numeric"
                  maxLength={12}
                />
              </View>
              {formErr.amount ? <Text style={styles.errMsg}>{formErr.amount}</Text> : null}

              <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Date</Text>
              <View style={styles.fieldRow}>
                <TextInput
                  style={styles.fieldInput}
                  value={form.date}
                  onChangeText={setField('date')}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={COLORS.border}
                  keyboardType="default"
                  maxLength={10}
                />
              </View>

              <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Note (optional)</Text>
              <View style={styles.fieldRow}>
                <TextInput
                  style={styles.fieldInput}
                  value={form.note}
                  onChangeText={setField('note')}
                  placeholder="What did you spend on?"
                  placeholderTextColor={COLORS.border}
                  keyboardType="default"
                  maxLength={60}
                />
              </View>

              <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Category</Text>
              <View style={styles.catGrid}>
                {EXPENSE_CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.catChip,
                      form.categoryId === cat.id && {
                        backgroundColor: cat.color,
                        borderColor: cat.color,
                      },
                    ]}
                    onPress={() => setField('categoryId')(cat.id)}
                  >
                    <Text style={styles.catEmoji}>{cat.emoji}</Text>
                    <Text
                      style={[
                        styles.catChipLabel,
                        form.categoryId === cat.id && { color: '#fff' },
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity style={styles.saveBtn} onPress={handleAdd}>
                <LinearGradient
                  colors={COLORS.gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.saveBtnInner}
                >
                  <Text style={styles.saveBtnLabel}>Add Expense</Text>
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },

  header: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 20,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    overflow: 'hidden',
    position: 'relative',
  },
  headerOrb: {
    position: 'absolute', right: -50, top: -50,
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: 'rgba(201,162,74,0.22)',
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  addBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  ghostBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  ghostBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  totalBox: {
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 14,
    padding: 14, marginTop: 14,
  },
  totalLabel: { fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },
  totalAmount: { fontSize: 26, fontWeight: '800', color: '#fff', marginTop: 2 },

  body: { padding: 16 },
  card: {
    backgroundColor: COLORS.card, borderRadius: 16, padding: 16,
    marginBottom: 14, ...COLORS.shadow,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 14 },

  monthRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  monthBadge: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  monthBadgeText: { fontSize: 12, fontWeight: '800', color: COLORS.primary, letterSpacing: 0.5 },
  monthName: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  monthMeta: { fontSize: 11, color: COLORS.subtext, marginTop: 2 },
  monthAmount: { fontSize: 14, fontWeight: '800', color: COLORS.text },

  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  emptySub: { fontSize: 13, color: COLORS.subtext, marginTop: 4 },

  expRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  expIcon: {
    width: 38, height: 38, borderRadius: 19,
    justifyContent: 'center', alignItems: 'center', marginRight: 10,
  },
  expEmoji: { fontSize: 17 },
  expBody: { flex: 1, marginRight: 8 },
  expNote: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  expMeta: { fontSize: 11, color: COLORS.subtext, marginTop: 2 },
  expRight: { alignItems: 'flex-end', gap: 4 },
  expAmt: { fontSize: 14, fontWeight: '700', color: COLORS.text },

  modal: { flex: 1, backgroundColor: COLORS.background },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: COLORS.card, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  modalBody: { padding: 16, paddingBottom: 40 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: COLORS.subtext, marginBottom: 6 },
  fieldRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 12,
    backgroundColor: COLORS.card, paddingHorizontal: 14, height: 52,
  },
  fieldErr: { borderColor: COLORS.error },
  prefix: { fontSize: 16, color: COLORS.subtext, marginRight: 8 },
  fieldInput: { flex: 1, fontSize: 16, color: COLORS.text, fontWeight: '500', padding: 0 },
  errMsg: { fontSize: 11, color: COLORS.error, marginTop: 4, marginLeft: 2 },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1.5, borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  catEmoji: { fontSize: 14 },
  catChipLabel: { fontSize: 12, fontWeight: '600', color: COLORS.subtext },
  saveBtn: { borderRadius: 14, overflow: 'hidden' },
  saveBtnInner: { height: 54, justifyContent: 'center', alignItems: 'center' },
  saveBtnLabel: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
