import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert,
  KeyboardAvoidingView, Platform, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { COLORS } from '../constants/colors';
import { VAULT_TYPES } from '../constants/vaultTypes';
import VaultService from '../services/VaultService';
import PrimaryButton from '../components/PrimaryButton';
import { useVaultUnlock } from '../context/VaultUnlockContext';

const pad = (n) => String(n).padStart(2, '0');
const formatDDMMYYYY = (d) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
const parseDDMMYYYY = (s) => {
  if (!s) return null;
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s.trim());
  if (!m) return null;
  const d = new Date(+m[3], +m[2] - 1, +m[1]);
  return Number.isNaN(d.getTime()) ? null : d;
};

export default function VaultEntryEditScreen({ navigation, route }) {
  const { type, id } = route.params || {};
  const { unlocked, touch } = useVaultUnlock();
  const cfg = VAULT_TYPES[type];

  const [values, setValues] = useState({});
  const [revealed, setRevealed] = useState({}); // per-field temporary reveal
  const [pickerFor, setPickerFor] = useState(null); // key of date field whose picker is open
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!unlocked) navigation.replace('VaultUnlock');
  }, [unlocked, navigation]);

  useEffect(() => {
    if (!id) return;
    VaultService.list().then((all) => {
      const entry = all.find((e) => e.id === id);
      if (entry) {
        const v = {};
        cfg.fields.forEach((f) => { v[f.key] = entry[f.key] || ''; });
        setValues(v);
      }
    });
  }, [id, cfg]);

  const setField = useCallback((key) => (val) => {
    setValues((p) => ({ ...p, [key]: val }));
  }, []);

  const save = async () => {
    if (saving) return;
    const hasValue = cfg.fields.some((f) => (values[f.key] || '').trim().length > 0);
    if (!hasValue) {
      Alert.alert('Empty entry', 'Fill in at least one field.');
      return;
    }
    for (const f of cfg.fields) {
      const v = (values[f.key] || '').trim();
      if (f.max && v.length > f.max) {
        Alert.alert('Too long', `${f.label} must be at most ${f.max} characters.`);
        return;
      }
    }
    setSaving(true);
    try {
      await VaultService.upsert({ id, type, ...values });
      navigation.goBack();
    } catch (err) {
      Alert.alert('Could not save', err?.message || 'Unknown error while saving to vault.');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = () => {
    Alert.alert('Delete entry?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => { await VaultService.remove(id); navigation.goBack(); },
      },
    ]);
  };

  if (!cfg) return null;
  if (!unlocked) return null;

  return (
    <SafeAreaView style={styles.safe} edges={['top']} onTouchStart={touch}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.title}>{id ? 'Edit' : 'New'} {cfg.label}</Text>
        </View>
        {id ? (
          <TouchableOpacity onPress={onDelete} style={[styles.iconBtn, { backgroundColor: '#FCE6EC' }]}>
            <Ionicons name="trash-outline" size={18} color={COLORS.error} />
          </TouchableOpacity>
        ) : <View style={{ width: 38 }} />}
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <View style={[styles.typeBadge, { backgroundColor: cfg.soft }]}>
            <Ionicons name={cfg.icon} size={20} color={cfg.color} />
          </View>

          {cfg.warning ? (
            <View style={styles.warningCard}>
              <Ionicons name="warning-outline" size={16} color={COLORS.warning} />
              <Text style={styles.warningText}>{cfg.warning}</Text>
            </View>
          ) : null}

          {cfg.fields.map((f) => {
            const v = values[f.key] || '';
            const isSensitive = !!f.sensitive;
            const isRevealed = !!revealed[f.key];
            const maskInput = isSensitive && !isRevealed && !f.multiline;
            const isDate = f.type === 'date';

            return (
              <View key={f.key} style={{ marginBottom: 14 }}>
                <View style={styles.labelRow}>
                  <Text style={styles.fieldLabel}>{f.label}</Text>
                  {isSensitive && !f.multiline ? (
                    <TouchableOpacity
                      onPressIn={() => setRevealed((p) => ({ ...p, [f.key]: true }))}
                      onPressOut={() => setRevealed((p) => ({ ...p, [f.key]: false }))}
                    >
                      <Text style={styles.peek}>{isRevealed ? 'RELEASE TO HIDE' : 'HOLD TO REVEAL'}</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>

                {isDate ? (
                  <TouchableOpacity
                    style={[styles.input, styles.dateRow]}
                    onPress={() => setPickerFor(f.key)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.dateText, !v && styles.datePlaceholder]}>
                      {v || 'Select date'}
                    </Text>
                    <Ionicons name="calendar-outline" size={18} color={COLORS.subtext} />
                  </TouchableOpacity>
                ) : (
                  <TextInput
                    style={[styles.input, f.multiline && styles.inputMultiline]}
                    value={v}
                    onChangeText={setField(f.key)}
                    placeholder={f.label}
                    multiline={!!f.multiline}
                    maxLength={f.max}
                    keyboardType={f.keyboard || 'default'}
                    autoCapitalize={f.autoCap || 'sentences'}
                    autoCorrect={false}
                    secureTextEntry={maskInput}
                  />
                )}
              </View>
            );
          })}

          <PrimaryButton
            title={id ? 'Save changes' : 'Save to vault'}
            onPress={save}
            loading={saving}
            style={{ marginTop: 10 }}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      {pickerFor && (
        Platform.OS === 'ios' ? (
          <Modal transparent animationType="fade" onRequestClose={() => setPickerFor(null)}>
            <View style={styles.pickerBackdrop}>
              <View style={styles.pickerSheet}>
                <DateTimePicker
                  value={parseDDMMYYYY(values[pickerFor]) || new Date()}
                  mode="date"
                  display="spinner"
                  onChange={(_, date) => {
                    if (date) setValues((p) => ({ ...p, [pickerFor]: formatDDMMYYYY(date) }));
                  }}
                />
                <PrimaryButton title="Done" onPress={() => setPickerFor(null)} />
              </View>
            </View>
          </Modal>
        ) : (
          <DateTimePicker
            value={parseDDMMYYYY(values[pickerFor]) || new Date()}
            mode="date"
            display="default"
            onChange={(event, date) => {
              const key = pickerFor;
              setPickerFor(null);
              if (event?.type === 'set' && date) {
                setValues((p) => ({ ...p, [key]: formatDDMMYYYY(date) }));
              }
            }}
          />
        )
      )}
    </SafeAreaView>
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
  title: { fontSize: 16, fontWeight: '800', color: COLORS.text },

  body: { padding: 18, paddingBottom: 40 },
  typeBadge: {
    alignSelf: 'flex-start',
    width: 52, height: 52, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },

  warningCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#FFF6E5', borderRadius: 12, padding: 12, marginBottom: 14,
    borderWidth: 1, borderColor: '#F0DDB0',
  },
  warningText: { flex: 1, fontSize: 12, color: '#7A5A10', lineHeight: 17 },

  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 },
  fieldLabel: { fontSize: 12, color: COLORS.subtext, fontWeight: '700' },
  peek: { fontSize: 10, color: COLORS.primary, fontWeight: '800', letterSpacing: 0.6 },

  input: {
    backgroundColor: COLORS.card, borderRadius: 12, paddingHorizontal: 14, height: 48,
    fontSize: 14, color: COLORS.text, borderWidth: 1, borderColor: COLORS.border,
  },
  inputMultiline: { height: 110, paddingTop: 12, textAlignVertical: 'top' },

  dateRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  dateText: { fontSize: 14, color: COLORS.text, fontWeight: '600' },
  datePlaceholder: { color: COLORS.faint, fontWeight: '400' },

  pickerBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: COLORS.background, padding: 18, paddingBottom: 32,
    borderTopLeftRadius: 24, borderTopRightRadius: 24, gap: 12,
  },
});
