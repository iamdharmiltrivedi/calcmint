import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Modal, Alert, FlatList, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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

const EMPTY_FORM = { amount: '', categoryId: 'food', note: '', date: today() };

export default function ExpenseAnalysisScreen() {
  const { expenses, addExpense, removeExpense } = useApp();
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErr, setFormErr] = useState({});

  // Current-month filter
  const thisMonth = new Date().toISOString().slice(0, 7); // "2024-03"
  const monthExpenses = expenses.filter(
    (e) => (e.date || e.createdAt || '').slice(0, 7) === thisMonth,
  );
  const totalThisMonth = monthExpenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0);

  // Group by category for the donut chart
  const categoryTotals = EXPENSE_CATEGORIES.map((cat) => {
    const total = monthExpenses
      .filter((e) => e.categoryId === cat.id)
      .reduce((s, e) => s + parseFloat(e.amount || 0), 0);
    return { ...cat, value: total };
  }).filter((c) => c.value > 0);

  const setField = (key) => (val) => setForm((p) => ({ ...p, [key]: val }));

  const validateForm = () => {
    const e = {};
    const amt = parseFloat(form.amount);
    if (!amt || amt <= 0 || amt > 10_000_000) e.amount = 'Enter a valid amount';
    setFormErr(e);
    return Object.keys(e).length === 0;
  };

  const handleAdd = async () => {
    if (!validateForm()) return;
    await addExpense({
      amount:     parseFloat(form.amount),
      categoryId: form.categoryId,
      note:       form.note.trim(),
      date:       form.date || today(),
    });
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

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <BrandHeader />

      {/* Month-summary hero */}
      <LinearGradient colors={COLORS.gradient} style={styles.header}>
        <View style={styles.headerOrb} />
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Expense Tracker</Text>
            <Text style={styles.headerSub}>
              {new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' })}
            </Text>
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
            <Ionicons name="add" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.totalBox}>
          <Text style={styles.totalLabel}>Total Spent This Month</Text>
          <Text style={styles.totalAmount}>{formatINRFull(totalThisMonth)}</Text>
        </View>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
        {/* Donut chart — only shown if there are expenses */}
        {categoryTotals.length > 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Spending Breakdown</Text>
            <DonutChart
              data={categoryTotals.map((c) => ({
                label: c.emoji + ' ' + c.label,
                value: c.value,
                color: c.color,
              }))}
              centerValue={totalThisMonth}
              centerLabel="This Month"
              size={200}
            />
          </View>
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>💸</Text>
            <Text style={styles.emptyTitle}>No expenses yet</Text>
            <Text style={styles.emptySub}>Tap + to add your first expense</Text>
          </View>
        )}

        {/* Expense list */}
        {monthExpenses.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              Transactions ({monthExpenses.length})
            </Text>
            {monthExpenses.map((item) => {
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

        <AdBanner style={{ marginTop: 18 }} />
      </ScrollView>

      {/* ── Add Expense Modal ──────────────────────────────────────────── */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.modal} edges={['top']}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Expense</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">

              {/* Amount */}
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

              {/* Date */}
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

              {/* Note */}
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

              {/* Category grid */}
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

  // Header
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
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  addBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  totalBox: {
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 14,
    padding: 14, marginTop: 14,
  },
  totalLabel: { fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },
  totalAmount: { fontSize: 26, fontWeight: '800', color: '#fff', marginTop: 2 },

  // Body
  body: { padding: 16, paddingBottom: 32 },
  card: {
    backgroundColor: COLORS.card, borderRadius: 16, padding: 16,
    marginBottom: 14, ...COLORS.shadow,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 14 },

  // Empty
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  emptySub: { fontSize: 13, color: COLORS.subtext, marginTop: 4 },

  // Expense row
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

  // Modal
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
