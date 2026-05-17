import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal,
  TextInput, Alert, Platform, KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, MONO_STYLE } from '../constants/colors';
import StorageService from '../services/StorageService';
import NotificationService from '../services/NotificationService';
import { formatINRFull } from '../utils/formatters';
import PrimaryButton from '../components/PrimaryButton';

const CYCLES = [
  { key: 'monthly', label: 'Monthly', months: 1 },
  { key: 'quarterly', label: 'Quarterly', months: 3 },
  { key: 'yearly', label: 'Yearly', months: 12 },
];

const CATEGORY_ICONS = {
  ott: 'film-outline',
  music: 'musical-notes-outline',
  cloud: 'cloud-outline',
  utility: 'flash-outline',
  fitness: 'barbell-outline',
  news: 'newspaper-outline',
  other: 'apps-outline',
};

const CATEGORIES = [
  { key: 'ott', label: 'OTT' },
  { key: 'music', label: 'Music' },
  { key: 'cloud', label: 'Cloud' },
  { key: 'utility', label: 'Utility' },
  { key: 'fitness', label: 'Fitness' },
  { key: 'news', label: 'News' },
  { key: 'other', label: 'Other' },
];

const monthlyAmount = (s) => {
  const c = CYCLES.find((c) => c.key === s.cycle) || CYCLES[0];
  return s.amount / c.months;
};

const daysUntil = (iso) => {
  const d = new Date(iso);
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.round((d - t) / 86400000);
};

export default function SubscriptionsScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    StorageService.getSubscriptions().then(setItems);
  }, []);

  const persist = useCallback(async (next) => {
    setItems(next);
    await StorageService.saveSubscriptions(next);
  }, []);

  const monthlyTotal = useMemo(
    () => items.reduce((s, i) => s + monthlyAmount(i), 0),
    [items],
  );
  const yearlyTotal = monthlyTotal * 12;

  const upcoming = useMemo(
    () => [...items]
      .filter((i) => i.nextRenewal)
      .sort((a, b) => new Date(a.nextRenewal) - new Date(b.nextRenewal))
      .slice(0, 3),
    [items],
  );

  const scheduleReminder = async (sub) => {
    if (!sub.nextRenewal || !sub.reminderEnabled) return null;
    const renewal = new Date(sub.nextRenewal);
    const remindAt = new Date(renewal.getTime() - 24 * 60 * 60 * 1000);
    remindAt.setHours(9, 0, 0, 0);
    return NotificationService.scheduleAt(remindAt, {
      title: 'Subscription renewing tomorrow',
      body: `${sub.name} (${formatINRFull(sub.amount)}) renews on ${renewal.toLocaleDateString('en-IN')}.`,
      data: { kind: 'subscription', id: sub.id },
    });
  };

  const onAdd = async (sub) => {
    const id = Date.now().toString();
    const withId = { ...sub, id };
    const reminderId = await scheduleReminder(withId);
    persist([{ ...withId, reminderId }, ...items]);
    setShowAdd(false);
  };

  const onDelete = (id) => {
    Alert.alert('Delete subscription?', '', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const target = items.find((i) => i.id === id);
          if (target?.reminderId) await NotificationService.cancel(target.reminderId);
          persist(items.filter((i) => i.id !== id));
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Subscriptions</Text>
        <TouchableOpacity onPress={() => setShowAdd(true)} style={[styles.iconBtn, { backgroundColor: COLORS.text }]}>
          <Ionicons name="add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={COLORS.gradient} style={styles.hero}>
          <Text style={styles.heroLabel}>MONTHLY SPEND</Text>
          <Text style={styles.heroValue}>{formatINRFull(monthlyTotal)}</Text>
          <View style={styles.heroSplit}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroStatLabel}>YEARLY</Text>
              <Text style={styles.heroStatValue}>{formatINRFull(yearlyTotal)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroStatLabel}>ACTIVE</Text>
              <Text style={styles.heroStatValue}>{items.length}</Text>
            </View>
          </View>
        </LinearGradient>

        {upcoming.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Upcoming renewals</Text>
            {upcoming.map((s) => {
              const d = daysUntil(s.nextRenewal);
              const tag = d < 0 ? 'overdue' : d === 0 ? 'today' : d <= 7 ? 'soon' : 'later';
              const color = tag === 'overdue' || tag === 'today' ? COLORS.error
                          : tag === 'soon' ? COLORS.warning : COLORS.subtext;
              return (
                <View key={s.id} style={styles.upcomingRow}>
                  <Ionicons name="calendar-outline" size={16} color={color} />
                  <Text style={styles.upcomingName}>{s.name}</Text>
                  <Text style={[styles.upcomingDays, { color }]}>
                    {d < 0 ? `${-d}d ago` : d === 0 ? 'today' : `in ${d}d`}
                  </Text>
                </View>
              );
            })}
          </>
        )}

        <Text style={styles.sectionTitle}>All subscriptions</Text>

        {items.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📦</Text>
            <Text style={styles.emptyTitle}>No subscriptions yet</Text>
            <Text style={styles.emptyHint}>Add the recurring services you pay for.</Text>
          </View>
        ) : (
          items.map((s) => (
            <SubRow key={s.id} sub={s} onDelete={() => onDelete(s.id)} />
          ))
        )}
      </ScrollView>

      <AddSubscriptionModal
        visible={showAdd}
        onClose={() => setShowAdd(false)}
        onAdd={onAdd}
      />
    </SafeAreaView>
  );
}

function SubRow({ sub, onDelete }) {
  const iconName = CATEGORY_ICONS[sub.category] || CATEGORY_ICONS.other;
  const cycle = CYCLES.find((c) => c.key === sub.cycle)?.label || 'Monthly';
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <Ionicons name={iconName} size={18} color={COLORS.primary} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.rowName} numberOfLines={1}>{sub.name}</Text>
        <Text style={styles.rowMeta}>{cycle}{sub.nextRenewal ? `  ·  next ${new Date(sub.nextRenewal).toLocaleDateString('en-IN')}` : ''}</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={styles.rowAmount}>{formatINRFull(sub.amount)}</Text>
        <TouchableOpacity onPress={onDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.delete}>Remove</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function AddSubscriptionModal({ visible, onClose, onAdd }) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [cycle, setCycle] = useState('monthly');
  const [category, setCategory] = useState('ott');
  const [nextRenewal, setNextRenewal] = useState('');
  const [reminderEnabled, setReminderEnabled] = useState(true);

  const reset = () => {
    setName(''); setAmount(''); setCycle('monthly'); setCategory('ott');
    setNextRenewal(''); setReminderEnabled(true);
  };

  const submit = () => {
    const amt = parseFloat(amount);
    if (!name.trim() || !amt || amt <= 0) {
      Alert.alert('Missing info', 'Enter a name and a valid amount.');
      return;
    }
    let iso = '';
    if (nextRenewal) {
      const m = nextRenewal.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
      if (!m) {
        Alert.alert('Invalid date', 'Use DD/MM/YYYY format.');
        return;
      }
      const [, d, mo, y] = m;
      const dt = new Date(Number(y), Number(mo) - 1, Number(d));
      if (isNaN(dt)) { Alert.alert('Invalid date'); return; }
      iso = dt.toISOString();
    }
    onAdd({
      name: name.trim(),
      amount: amt,
      cycle,
      category,
      nextRenewal: iso,
      reminderEnabled: reminderEnabled && !!iso,
      createdAt: new Date().toISOString(),
    });
    reset();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => { reset(); onClose(); }}>
            <Text style={styles.modalCancel}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>New subscription</Text>
          <View style={{ width: 50 }} />
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ padding: 18 }} keyboardShouldPersistTaps="handled">
            <Field label="Name">
              <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="e.g. Netflix" />
            </Field>
            <Field label="Amount">
              <TextInput
                style={styles.input}
                value={amount}
                onChangeText={setAmount}
                placeholder="e.g. 199"
                keyboardType="numeric"
              />
            </Field>

            <Field label="Cycle">
              <View style={styles.segRow}>
                {CYCLES.map((c) => (
                  <TouchableOpacity
                    key={c.key}
                    style={[styles.seg, cycle === c.key && styles.segActive]}
                    onPress={() => setCycle(c.key)}
                  >
                    <Text style={[styles.segText, cycle === c.key && { color: '#fff' }]}>{c.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Field>

            <Field label="Category">
              <View style={[styles.segRow, { flexWrap: 'wrap', gap: 8 }]}>
                {CATEGORIES.map((c) => (
                  <TouchableOpacity
                    key={c.key}
                    style={[styles.chip, category === c.key && styles.chipActive]}
                    onPress={() => setCategory(c.key)}
                  >
                    <Ionicons
                      name={CATEGORY_ICONS[c.key]}
                      size={14}
                      color={category === c.key ? '#fff' : COLORS.subtext}
                    />
                    <Text style={[styles.chipText, category === c.key && { color: '#fff' }]}>{c.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Field>

            <Field label="Next renewal (DD/MM/YYYY, optional)">
              <TextInput
                style={styles.input}
                value={nextRenewal}
                onChangeText={setNextRenewal}
                placeholder="e.g. 15/06/2026"
              />
            </Field>

            <TouchableOpacity
              style={[styles.toggleRow, !nextRenewal && { opacity: 0.5 }]}
              activeOpacity={0.7}
              disabled={!nextRenewal}
              onPress={() => setReminderEnabled((v) => !v)}
            >
              <Ionicons
                name={reminderEnabled ? 'notifications' : 'notifications-off-outline'}
                size={18}
                color={reminderEnabled ? COLORS.primary : COLORS.subtext}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.toggleTitle}>Remind me 1 day before</Text>
                <Text style={styles.toggleHint}>
                  {nextRenewal ? 'Sends a local notification at 9:00 AM the day before.' : 'Set a renewal date to enable reminders.'}
                </Text>
              </View>
              <View style={[styles.switch, reminderEnabled && styles.switchOn]}>
                <View style={[styles.switchKnob, reminderEnabled && styles.switchKnobOn]} />
              </View>
            </TouchableOpacity>

            <PrimaryButton title="Save" onPress={submit} style={{ marginTop: 12 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

function Field({ label, children }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
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
  headerTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text, letterSpacing: -0.2 },

  body: { padding: 18, paddingBottom: 40 },

  hero: { borderRadius: 24, padding: 20, marginBottom: 8 },
  heroLabel: { fontSize: 10.5, fontWeight: '700', letterSpacing: 1.4, color: 'rgba(255,255,255,0.6)' },
  heroValue: { ...MONO_STYLE, fontSize: 32, fontWeight: '700', color: '#fff', marginTop: 6, letterSpacing: -1 },
  heroSplit: {
    flexDirection: 'row', marginTop: 14, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.10)',
  },
  heroStatLabel: { fontSize: 9.5, color: 'rgba(255,255,255,0.55)', fontWeight: '600', letterSpacing: 0.4 },
  heroStatValue: { ...MONO_STYLE, fontSize: 15, fontWeight: '700', color: '#fff', marginTop: 3 },

  sectionTitle: { fontSize: 13, fontWeight: '800', color: COLORS.text, marginTop: 18, marginBottom: 8, letterSpacing: -0.2 },

  upcomingRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: COLORS.card, borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: 8,
  },
  upcomingName: { flex: 1, fontSize: 14, fontWeight: '600', color: COLORS.text },
  upcomingDays: { fontSize: 12, fontWeight: '700' },

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
  rowAmount: { ...MONO_STYLE, fontSize: 14, fontWeight: '700', color: COLORS.text },
  delete: { fontSize: 11, color: COLORS.error, fontWeight: '700', marginTop: 4 },

  empty: { alignItems: 'center', paddingVertical: 32 },
  emptyIcon: { fontSize: 32, marginBottom: 8 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  emptyHint: { fontSize: 12, color: COLORS.subtext, marginTop: 4 },

  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  modalTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  modalCancel: { fontSize: 14, color: COLORS.subtext, fontWeight: '600' },

  fieldLabel: { fontSize: 12, color: COLORS.subtext, fontWeight: '700', marginBottom: 6, letterSpacing: 0.2 },
  input: {
    backgroundColor: COLORS.card, borderRadius: 12, paddingHorizontal: 14, height: 48,
    fontSize: 14, color: COLORS.text, borderWidth: 1, borderColor: COLORS.border,
  },
  segRow: { flexDirection: 'row', gap: 8 },
  seg: {
    flex: 1, height: 38, borderRadius: 10,
    borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center',
  },
  segActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  segText: { color: COLORS.subtext, fontSize: 13, fontWeight: '600' },

  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, height: 34, borderRadius: 17,
    borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.card,
  },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 12, color: COLORS.subtext, fontWeight: '600' },

  toggleRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.card, borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: 4,
  },
  toggleTitle: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  toggleHint: { fontSize: 11, color: COLORS.subtext, marginTop: 2 },
  switch: {
    width: 38, height: 22, borderRadius: 11, padding: 2,
    backgroundColor: COLORS.border, justifyContent: 'center',
  },
  switchOn: { backgroundColor: COLORS.primary },
  switchKnob: {
    width: 18, height: 18, borderRadius: 9, backgroundColor: '#fff',
  },
  switchKnobOn: { transform: [{ translateX: 16 }] },
});
