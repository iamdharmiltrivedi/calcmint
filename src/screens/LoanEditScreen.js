import React, { useEffect, useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, MONO_STYLE } from '../constants/colors';
import StorageService from '../services/StorageService';
import NotificationService from '../services/NotificationService';
import PrimaryButton from '../components/PrimaryButton';
import { summarizeLoan } from '../utils/loans';
import { formatINR, formatINRFull, formatMonths } from '../utils/formatters';

function toDDMMYYYY(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}
function parseDDMMYYYY(s) {
  if (!s) return null;
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (!m) return null;
  const [, d, mo, y] = m;
  const dt = new Date(Number(y), Number(mo) - 1, Number(d));
  return isNaN(dt) ? null : dt;
}

export default function LoanEditScreen({ navigation, route }) {
  const editingId = route.params?.id || null;

  const [name, setName] = useState('');
  const [principalStr, setPrincipalStr] = useState('');
  const [rateStr, setRateStr] = useState('');
  const [tenureStr, setTenureStr] = useState('');
  const [startDateStr, setStartDateStr] = useState(toDDMMYYYY(new Date().toISOString()));
  const [emiDayStr, setEmiDayStr] = useState('5');
  const [remindOnDay, setRemindOnDay] = useState(true);
  const [remindDayBefore, setRemindDayBefore] = useState(false);
  const [existing, setExisting] = useState(null);

  useEffect(() => {
    if (!editingId) return;
    StorageService.getLoans().then((all) => {
      const l = all.find((x) => x.id === editingId);
      if (!l) return;
      setExisting(l);
      setName(l.name || '');
      setPrincipalStr(l.principal ? String(l.principal) : '');
      setRateStr(l.rate != null ? String(l.rate) : '');
      setTenureStr(l.tenureMonths ? String(l.tenureMonths) : '');
      setStartDateStr(toDDMMYYYY(l.startDate));
      setEmiDayStr(l.emiDay ? String(l.emiDay) : '5');
      setRemindOnDay(l.remindOnDay !== false);
      setRemindDayBefore(!!l.remindDayBefore);
    });
  }, [editingId]);

  const preview = useMemo(() => {
    const principal = parseFloat(principalStr) || 0;
    const rate = parseFloat(rateStr) || 0;
    const tenure = parseInt(tenureStr, 10) || 0;
    const startDate = parseDDMMYYYY(startDateStr)?.toISOString() || new Date().toISOString();
    const emiDay = parseInt(emiDayStr, 10) || 1;
    return summarizeLoan({ principal, rate, tenureMonths: tenure, startDate, emiDay });
  }, [principalStr, rateStr, tenureStr, startDateStr, emiDayStr]);

  const validate = () => {
    if (!name.trim()) return 'Give the loan a name.';
    const p = parseFloat(principalStr);
    const r = parseFloat(rateStr);
    const t = parseInt(tenureStr, 10);
    const day = parseInt(emiDayStr, 10);
    if (!p || p <= 0) return 'Principal must be greater than zero.';
    if (r == null || isNaN(r) || r < 0 || r > 50) return 'Interest rate must be between 0 and 50%.';
    if (!t || t < 1 || t > 480) return 'Tenure must be between 1 and 480 months.';
    if (!day || day < 1 || day > 28) return 'EMI day must be between 1 and 28.';
    if (!parseDDMMYYYY(startDateStr)) return 'Start date must be DD/MM/YYYY.';
    return null;
  };

  const save = async () => {
    const err = validate();
    if (err) { Alert.alert('Please check the form', err); return; }

    const principal = parseFloat(principalStr);
    const rate = parseFloat(rateStr);
    const tenureMonths = parseInt(tenureStr, 10);
    const emiDay = parseInt(emiDayStr, 10);
    const startDate = parseDDMMYYYY(startDateStr).toISOString();

    // Cancel any prior reminders for this loan
    const prior = existing?.notifIds ? Object.values(existing.notifIds).filter(Boolean) : [];
    if (prior.length) await NotificationService.cancelMany(prior);

    // Schedule new reminders based on toggles
    const notifIds = {};
    const baseTitle = `EMI due — ${name.trim()}`;
    const baseBody = `${formatINRFull(preview.emi)} due on the ${emiDay}${ordinal(emiDay)}.`;

    if (remindOnDay) {
      const id = await NotificationService.scheduleMonthly({
        day: emiDay,
        hour: 9,
        minute: 0,
        title: baseTitle,
        body: baseBody,
        data: { kind: 'loan-emi', loanId: editingId || 'new' },
      });
      if (id) notifIds.onDay = id;
    }
    if (remindDayBefore) {
      const dayBefore = emiDay === 1 ? 28 : emiDay - 1;
      const id = await NotificationService.scheduleMonthly({
        day: dayBefore,
        hour: 9,
        minute: 0,
        title: `EMI due tomorrow — ${name.trim()}`,
        body: baseBody,
        data: { kind: 'loan-emi-prev', loanId: editingId || 'new' },
      });
      if (id) notifIds.dayBefore = id;
    }

    const all = await StorageService.getLoans();
    const id = editingId || Date.now().toString();
    const record = {
      id,
      name: name.trim(),
      principal,
      rate,
      tenureMonths,
      startDate,
      emiDay,
      remindOnDay,
      remindDayBefore,
      notifIds,
      createdAt: existing?.createdAt || new Date().toISOString(),
    };
    const next = editingId
      ? all.map((l) => (l.id === editingId ? record : l))
      : [record, ...all];
    await StorageService.saveLoans(next);
    navigation.goBack();
  };

  const onDelete = () => {
    if (!existing) return;
    Alert.alert('Delete loan?', `Reminders for ${existing.name} will be cancelled.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const ids = Object.values(existing.notifIds || {}).filter(Boolean);
          await NotificationService.cancelMany(ids);
          const all = await StorageService.getLoans();
          await StorageService.saveLoans(all.filter((l) => l.id !== existing.id));
          navigation.goBack();
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
        <Text style={styles.title}>{editingId ? 'Edit loan' : 'New loan'}</Text>
        {editingId ? (
          <TouchableOpacity onPress={onDelete} style={[styles.iconBtn, { backgroundColor: '#FCE6EC' }]}>
            <Ionicons name="trash-outline" size={18} color={COLORS.error} />
          </TouchableOpacity>
        ) : <View style={{ width: 38 }} />}
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">

          {/* Live preview */}
          <View style={styles.preview}>
            <View style={{ flex: 1 }}>
              <Text style={styles.previewLabel}>MONTHLY EMI</Text>
              <Text style={styles.previewValue}>{formatINRFull(preview.emi || 0)}</Text>
              <Text style={styles.previewHint}>
                {preview.remaining > 0
                  ? `${formatMonths(preview.remaining)} left · total interest ${formatINR(preview.totalInterest)}`
                  : 'Loan closed'}
              </Text>
            </View>
          </View>

          <Field label="Name">
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="e.g. HDFC Home Loan" />
          </Field>
          <Field label="Principal">
            <TextInput
              style={styles.input}
              value={principalStr}
              onChangeText={setPrincipalStr}
              placeholder="e.g. 2500000"
              keyboardType="numeric"
            />
          </Field>
          <Field label="Interest rate (% p.a.)">
            <TextInput
              style={styles.input}
              value={rateStr}
              onChangeText={setRateStr}
              placeholder="e.g. 8.5"
              keyboardType="numeric"
            />
          </Field>
          <Field label="Tenure (months)">
            <TextInput
              style={styles.input}
              value={tenureStr}
              onChangeText={setTenureStr}
              placeholder="e.g. 240 (20 years)"
              keyboardType="numeric"
            />
          </Field>
          <Field label="Loan start date (DD/MM/YYYY)">
            <TextInput
              style={styles.input}
              value={startDateStr}
              onChangeText={setStartDateStr}
              placeholder="DD/MM/YYYY"
            />
          </Field>
          <Field label="EMI day of month (1–28)">
            <TextInput
              style={styles.input}
              value={emiDayStr}
              onChangeText={setEmiDayStr}
              placeholder="e.g. 5"
              keyboardType="numeric"
            />
            <Text style={styles.hint}>Capped at 28 so every month has the same day.</Text>
          </Field>

          <Text style={[styles.sectionTitle]}>Reminders</Text>
          <Toggle
            icon="notifications"
            title="On EMI day, 9 AM"
            subtitle={`Recurs monthly on the ${emiDayStr || '?'}${ordinal(parseInt(emiDayStr, 10) || 0)}`}
            value={remindOnDay}
            onValueChange={setRemindOnDay}
          />
          <Toggle
            icon="alarm"
            title="One day before, 9 AM"
            subtitle="Gentle heads-up"
            value={remindDayBefore}
            onValueChange={setRemindDayBefore}
          />
          <Text style={styles.hint}>
            Local notifications only — nothing leaves your device. Make sure notifications are allowed in system settings.
          </Text>

          <PrimaryButton title={editingId ? 'Save changes' : 'Add loan'} onPress={save} style={{ marginTop: 18 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ordinal(n) {
  if (!n) return '';
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

function Field({ label, children }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

function Toggle({ icon, title, subtitle, value, onValueChange }) {
  return (
    <TouchableOpacity
      style={styles.toggleRow}
      activeOpacity={0.8}
      onPress={() => onValueChange(!value)}
    >
      <Ionicons name={icon} size={18} color={value ? COLORS.primary : COLORS.subtext} />
      <View style={{ flex: 1 }}>
        <Text style={styles.toggleTitle}>{title}</Text>
        <Text style={styles.toggleHint}>{subtitle}</Text>
      </View>
      <View style={[styles.switch, value && styles.switchOn]}>
        <View style={[styles.switchKnob, value && styles.switchKnobOn]} />
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

  preview: {
    backgroundColor: COLORS.card, borderRadius: 16, padding: 16, marginBottom: 14,
    borderWidth: 1, borderColor: COLORS.border,
  },
  previewLabel: { fontSize: 10.5, color: COLORS.subtext, fontWeight: '700', letterSpacing: 0.6 },
  previewValue: { ...MONO_STYLE, fontSize: 22, fontWeight: '700', color: COLORS.text, marginTop: 4, letterSpacing: -0.5 },
  previewHint: { fontSize: 11, color: COLORS.subtext, marginTop: 4 },

  fieldLabel: { fontSize: 12, color: COLORS.subtext, fontWeight: '700', marginBottom: 6 },
  input: {
    backgroundColor: COLORS.card, borderRadius: 12, paddingHorizontal: 14, height: 48,
    fontSize: 14, color: COLORS.text, borderWidth: 1, borderColor: COLORS.border,
  },
  hint: { fontSize: 11, color: COLORS.subtext, marginTop: 6 },

  sectionTitle: { fontSize: 12, color: COLORS.subtext, fontWeight: '800', letterSpacing: 0.6, marginTop: 6, marginBottom: 8 },

  toggleRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.card, borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: 8,
  },
  toggleTitle: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  toggleHint: { fontSize: 11, color: COLORS.subtext, marginTop: 2 },
  switch: {
    width: 38, height: 22, borderRadius: 11, padding: 2,
    backgroundColor: COLORS.border, justifyContent: 'center',
  },
  switchOn: { backgroundColor: COLORS.primary },
  switchKnob: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#fff' },
  switchKnobOn: { transform: [{ translateX: 16 }] },
});
