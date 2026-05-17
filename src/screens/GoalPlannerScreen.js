import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Modal, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { useApp } from '../context/AppContext';
import AdBanner from '../components/AdBanner';
import { calculateGoalSIP } from '../utils/calculations';
import { formatINR, formatINRFull, formatYears } from '../utils/formatters';

const EMPTY_FORM = { name: '', goalAmount: '', years: '', rate: '12' };

export default function GoalPlannerScreen() {
  const { goals, addGoal, removeGoal } = useApp();
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm]   = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  const setField = (key) => (val) => setForm((p) => ({ ...p, [key]: val }));

  const validate = () => {
    const e = {};
    const ga = parseFloat(form.goalAmount);
    const yr = parseFloat(form.years);
    const r  = parseFloat(form.rate);
    if (!form.name.trim())                e.name       = 'Enter a goal name';
    if (!ga || ga <= 0 || ga > 100_000_000) e.goalAmount = 'Enter ₹1 – ₹10 Crore';
    if (!yr || yr < 1 || yr > 40)          e.years      = '1 – 40 years';
    if (!r  || r < 0.1 || r > 30)          e.rate       = '0.1% – 30%';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    const { monthlySIP } = calculateGoalSIP(
      parseFloat(form.goalAmount),
      parseFloat(form.years),
      parseFloat(form.rate),
    );
    await addGoal({
      name:         form.name.trim(),
      targetAmount: parseFloat(form.goalAmount),
      years:        parseFloat(form.years),
      rate:         parseFloat(form.rate),
      monthlySIP,
    });
    setForm(EMPTY_FORM);
    setErrors({});
    setModalVisible(false);
  };

  const confirmDelete = (id, name) => {
    Alert.alert(
      'Remove Goal',
      `Delete "${name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => removeGoal(id) },
      ],
    );
  };

  // Progress = months elapsed / total months  (approximate, capped at 100)
  const progressPct = (goal) => {
    const created = new Date(goal.createdAt || Date.now());
    const elapsed = (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24 * 30);
    const total = goal.years * 12;
    return Math.min(100, Math.round((elapsed / total) * 100));
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <LinearGradient colors={COLORS.gradient} style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>My Financial Goals</Text>
            <Text style={styles.headerSub}>{goals.length} goal{goals.length !== 1 ? 's' : ''} saved</Text>
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
            <Ionicons name="add" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {goals.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🎯</Text>
            <Text style={styles.emptyTitle}>No goals yet</Text>
            <Text style={styles.emptySub}>Add your first financial goal</Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => setModalVisible(true)}
            >
              <Text style={styles.emptyBtnLabel}>+ Add Goal</Text>
            </TouchableOpacity>
          </View>
        ) : (
          goals.map((goal) => {
            const pct = progressPct(goal);
            const totalInvested = goal.monthlySIP * goal.years * 12;
            const returns = goal.targetAmount - totalInvested;
            return (
              <View key={goal.id} style={styles.goalCard}>
                {/* Card header */}
                <View style={styles.goalHeader}>
                  <View style={[styles.goalIcon, { backgroundColor: COLORS.primary + '20' }]}>
                    <Ionicons name="flag" size={20} color={COLORS.primary} />
                  </View>
                  <View style={styles.goalMeta}>
                    <Text style={styles.goalName}>{goal.name}</Text>
                    <Text style={styles.goalSub}>
                      {formatYears(goal.years)} · {goal.rate}% p.a.
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => confirmDelete(goal.id, goal.name)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="trash-outline" size={16} color={COLORS.error} />
                  </TouchableOpacity>
                </View>

                {/* Amounts */}
                <View style={styles.amtRow}>
                  <View style={styles.amtCell}>
                    <Text style={styles.amtLabel}>Target</Text>
                    <Text style={[styles.amtValue, { color: COLORS.primary }]}>
                      {formatINR(goal.targetAmount)}
                    </Text>
                  </View>
                  <View style={[styles.amtCell, styles.amtMiddle]}>
                    <Text style={styles.amtLabel}>Monthly SIP</Text>
                    <Text style={[styles.amtValue, { color: COLORS.secondary }]}>
                      {formatINR(goal.monthlySIP)}
                    </Text>
                  </View>
                  <View style={styles.amtCell}>
                    <Text style={styles.amtLabel}>Returns</Text>
                    <Text style={[styles.amtValue, { color: COLORS.success }]}>
                      {formatINR(returns)}
                    </Text>
                  </View>
                </View>

                {/* Progress bar */}
                <View style={styles.progressWrap}>
                  <View style={styles.progressHeader}>
                    <Text style={styles.progressLabel}>Time Progress</Text>
                    <Text style={styles.progressPct}>{pct}%</Text>
                  </View>
                  <View style={styles.progressTrack}>
                    <View
                      style={[styles.progressFill, { width: `${pct}%`, backgroundColor: COLORS.primary }]}
                    />
                  </View>
                </View>
              </View>
            );
          })
        )}

        <AdBanner style={{ marginTop: 18 }} />
      </ScrollView>

      {/* ── Add Goal Modal ──────────────────────────────────────────────── */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.modal} edges={['top']}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Financial Goal</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">

              {[
                {
                  key: 'name', label: 'Goal Name', placeholder: 'e.g. Dream Car',
                  keyboardType: 'default', prefix: null,
                },
                {
                  key: 'goalAmount', label: 'Target Amount', placeholder: 'e.g. 2000000',
                  keyboardType: 'numeric', prefix: '₹',
                },
                {
                  key: 'years', label: 'Time Period', placeholder: 'e.g. 5',
                  keyboardType: 'numeric', prefix: null, suffix: 'years',
                },
                {
                  key: 'rate', label: 'Expected Return', placeholder: '12',
                  keyboardType: 'numeric', prefix: null, suffix: '% p.a.',
                },
              ].map(({ key, label, placeholder, keyboardType, prefix, suffix }) => (
                <View key={key} style={styles.formField}>
                  <Text style={styles.fieldLabel}>{label}</Text>
                  <View style={[styles.fieldRow, errors[key] && styles.fieldErr]}>
                    {prefix ? <Text style={styles.affix}>{prefix}</Text> : null}
                    <TextInput
                      style={styles.fieldInput}
                      value={form[key]}
                      onChangeText={setField(key)}
                      placeholder={placeholder}
                      placeholderTextColor={COLORS.border}
                      keyboardType={keyboardType}
                      maxLength={40}
                    />
                    {suffix ? <Text style={styles.affix}>{suffix}</Text> : null}
                  </View>
                  {errors[key] ? <Text style={styles.errMsg}>{errors[key]}</Text> : null}
                </View>
              ))}

              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <LinearGradient
                  colors={COLORS.gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.saveBtnInner}
                >
                  <Text style={styles.saveBtnLabel}>🎯 Save Goal</Text>
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
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  addBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center',
  },

  body: { padding: 16, paddingBottom: 32 },

  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 52, marginBottom: 14 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  emptySub: { fontSize: 13, color: COLORS.subtext, marginTop: 4, marginBottom: 20 },
  emptyBtn: {
    backgroundColor: COLORS.primary, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10,
  },
  emptyBtnLabel: { color: '#fff', fontSize: 14, fontWeight: '700' },

  // Goal card
  goalCard: {
    backgroundColor: COLORS.card, borderRadius: 16, padding: 16,
    marginBottom: 14, ...COLORS.shadow,
  },
  goalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 10 },
  goalIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  goalMeta: { flex: 1 },
  goalName: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  goalSub: { fontSize: 12, color: COLORS.subtext, marginTop: 2 },

  amtRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 12 },
  amtCell: { flex: 1, alignItems: 'center' },
  amtMiddle: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: COLORS.border },
  amtLabel: { fontSize: 10, color: COLORS.subtext, fontWeight: '600', textTransform: 'uppercase', marginBottom: 4 },
  amtValue: { fontSize: 14, fontWeight: '800' },

  progressWrap: { marginTop: 14 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressLabel: { fontSize: 11, color: COLORS.subtext, fontWeight: '500' },
  progressPct: { fontSize: 11, color: COLORS.primary, fontWeight: '700' },
  progressTrack: { height: 6, backgroundColor: COLORS.background, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },

  // Modal
  modal: { flex: 1, backgroundColor: COLORS.background },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: COLORS.card, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  modalBody: { padding: 16, paddingBottom: 40 },
  formField: { marginBottom: 14 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: COLORS.subtext, marginBottom: 6 },
  fieldRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 12,
    backgroundColor: COLORS.card, paddingHorizontal: 14, height: 52,
  },
  fieldErr: { borderColor: COLORS.error },
  affix: { fontSize: 16, color: COLORS.subtext, marginHorizontal: 4, fontWeight: '500' },
  fieldInput: { flex: 1, fontSize: 16, color: COLORS.text, fontWeight: '500', padding: 0 },
  errMsg: { fontSize: 11, color: COLORS.error, marginTop: 4 },
  saveBtn: { borderRadius: 14, overflow: 'hidden', marginTop: 6 },
  saveBtnInner: { height: 54, justifyContent: 'center', alignItems: 'center' },
  saveBtnLabel: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
