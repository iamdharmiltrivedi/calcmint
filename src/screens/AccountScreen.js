import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import StorageService from '../services/StorageService';
import ScreenHeader from '../components/ui/ScreenHeader';

// Lightweight profile screen. CalcMint is offline-first with no auth,
// so this is purely local data — name, monthly income (used by the
// dashboard surplus calc), and a reset shortcut.
export default function AccountScreen({ navigation }) {
  const [name, setName]       = useState('');
  const [income, setIncome]   = useState('');
  const [savedAt, setSavedAt] = useState(null);

  useEffect(() => {
    StorageService.getSettings().then((s) => {
      if (s) {
        setName(s.name || '');
        setIncome(s.monthlyIncome ? String(s.monthlyIncome) : '');
      }
    });
  }, []);

  const save = async () => {
    const current = await StorageService.getSettings();
    const next = {
      ...(current || {}),
      name: name.trim(),
      monthlyIncome: parseFloat(income) || 0,
    };
    await StorageService.saveSettings(next);
    setSavedAt(Date.now());
  };

  const reset = () => {
    Alert.alert(
      'Reset all data?',
      'This wipes expenses, goals, subscriptions, loans, calculator inputs, lock settings, and Markets data. There is no undo.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', style: 'destructive', onPress: async () => {
            await StorageService.clearAll();
            Alert.alert('Done', 'Restart the app to see a fresh state.');
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader parent="More" title="Account" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={28} color="#fff" />
        </View>

        <Text style={styles.label}>Display name</Text>
        <View style={styles.field}>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            placeholderTextColor={COLORS.faint}
          />
        </View>

        <Text style={[styles.label, { marginTop: 14 }]}>Monthly income</Text>
        <View style={styles.field}>
          <Text style={styles.prefix}>₹</Text>
          <TextInput
            style={styles.input}
            value={income}
            onChangeText={setIncome}
            placeholder="0"
            placeholderTextColor={COLORS.faint}
            keyboardType="numeric"
          />
        </View>
        <Text style={styles.hint}>Used to compute your “available to invest” surplus on the dashboard.</Text>

        <TouchableOpacity style={styles.saveBtn} onPress={save} activeOpacity={0.9}>
          <Text style={styles.saveText}>{savedAt ? 'Saved' : 'Save'}</Text>
        </TouchableOpacity>

        <Text style={[styles.label, { marginTop: 28 }]}>Danger zone</Text>
        <TouchableOpacity style={styles.dangerBtn} onPress={reset} activeOpacity={0.85}>
          <Ionicons name="trash-outline" size={16} color={COLORS.negative} />
          <Text style={styles.dangerText}>Reset all app data</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  body: { padding: 18, paddingBottom: 40 },

  avatar: { alignSelf: 'center', width: 76, height: 76, borderRadius: 38, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 22 },

  label: { fontSize: 11, fontWeight: '800', color: '#888888', letterSpacing: 0.66, textTransform: 'uppercase', marginBottom: 6 },
  field: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 12, paddingHorizontal: 14, height: 50, borderWidth: 0.5, borderColor: COLORS.hairline },
  prefix: { fontSize: 15, color: COLORS.subtext, fontWeight: '700', marginRight: 6 },
  input: { flex: 1, fontSize: 15, color: COLORS.text, fontWeight: '700' },
  hint: { fontSize: 11, color: COLORS.faint, fontWeight: '600', marginTop: 6 },

  saveBtn: { marginTop: 22, backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  saveText: { color: '#fff', fontWeight: '800', fontSize: 14 },

  dangerBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 14, borderRadius: 12,
    borderWidth: 0.5, borderColor: COLORS.negative, backgroundColor: COLORS.negativeSoft,
  },
  dangerText: { color: COLORS.negative, fontWeight: '800', fontSize: 13 },
});
