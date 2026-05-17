import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { VAULT_TYPES } from '../constants/vaultTypes';
import VaultService from '../services/VaultService';
import PrimaryButton from '../components/PrimaryButton';
import { useVaultUnlock } from '../context/VaultUnlockContext';

const maskValue = (s) => {
  if (!s) return '';
  if (s.length <= 4) return '•'.repeat(s.length);
  return '•'.repeat(Math.max(0, s.length - 4)) + s.slice(-4);
};

export default function VaultEntryEditScreen({ navigation, route }) {
  const { type, id } = route.params || {};
  const { unlocked, touch } = useVaultUnlock();
  const cfg = VAULT_TYPES[type];

  const [values, setValues] = useState({});
  const [revealed, setRevealed] = useState({}); // per-field temporary reveal

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
    // Require at least one non-empty field
    const hasValue = cfg.fields.some((f) => (values[f.key] || '').trim().length > 0);
    if (!hasValue) {
      Alert.alert('Empty entry', 'Fill in at least one field.');
      return;
    }
    // Enforce max length on sensitive fields
    for (const f of cfg.fields) {
      const v = (values[f.key] || '').trim();
      if (f.max && v.length > f.max) {
        Alert.alert('Too long', `${f.label} must be at most ${f.max} characters.`);
        return;
      }
    }
    await VaultService.upsert({ id, type, ...values });
    navigation.goBack();
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
            const displayValue = isSensitive && !isRevealed ? maskValue(v) : v;
            return (
              <View key={f.key} style={{ marginBottom: 14 }}>
                <View style={styles.labelRow}>
                  <Text style={styles.fieldLabel}>{f.label}</Text>
                  {isSensitive && v.length > 0 ? (
                    <TouchableOpacity
                      onPressIn={() => setRevealed((p) => ({ ...p, [f.key]: true }))}
                      onPressOut={() => setRevealed((p) => ({ ...p, [f.key]: false }))}
                    >
                      <Text style={styles.peek}>HOLD TO REVEAL</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
                <TextInput
                  style={[styles.input, f.multiline && styles.inputMultiline]}
                  value={isSensitive && !isRevealed ? displayValue : v}
                  onChangeText={setField(f.key)}
                  placeholder={f.label}
                  multiline={!!f.multiline}
                  maxLength={f.max}
                  keyboardType={f.keyboard || 'default'}
                  autoCapitalize={f.autoCap || 'sentences'}
                  autoCorrect={false}
                  secureTextEntry={false}
                  // When showing mask, prevent the user from editing the masked text
                  editable={!(isSensitive && !isRevealed && v.length > 0)}
                />
                {isSensitive && v.length > 0 && !isRevealed && (
                  <Text style={styles.hint}>Tap and hold the value above to reveal. Edit by clearing the field.</Text>
                )}
              </View>
            );
          })}

          <PrimaryButton title={id ? 'Save changes' : 'Save to vault'} onPress={save} style={{ marginTop: 10 }} />
        </ScrollView>
      </KeyboardAvoidingView>
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
  hint: { fontSize: 11, color: COLORS.subtext, marginTop: 6 },
});
