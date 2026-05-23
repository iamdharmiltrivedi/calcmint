import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import StorageService from '../services/StorageService';

const CYCLES = [
  { id: 'monthly',   label: 'Monthly' },
  { id: 'quarterly', label: 'Quarterly' },
  { id: 'yearly',    label: 'Yearly' },
];

const today = () => new Date().toISOString().split('T')[0];
const addMonths = (iso, n) => {
  const d = new Date(iso);
  d.setMonth(d.getMonth() + n);
  return d.toISOString().split('T')[0];
};

export default function AddSubscriptionScreen({ navigation }) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [cycle, setCycle] = useState('monthly');
  const [nextRenewal, setNextRenewal] = useState(addMonths(today(), 1));

  const submit = async () => {
    const amt = parseFloat(amount);
    if (!name.trim()) return Alert.alert('Enter a name');
    if (!amt || amt <= 0) return Alert.alert('Enter an amount');
    const subs = await StorageService.getSubscriptions();
    const next = [
      ...subs,
      {
        id: String(Date.now()),
        name: name.trim(),
        amount: amt,
        cycle,
        nextRenewal,
        createdAt: new Date().toISOString(),
      },
    ];
    await StorageService.saveSubscriptions(next);
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Add subscription</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="close" size={22} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Text style={styles.label}>Name</Text>
          <View style={styles.field}>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Netflix, Spotify, etc."
              placeholderTextColor={COLORS.faint}
              autoFocus
            />
          </View>

          <Text style={[styles.label, { marginTop: 14 }]}>Amount</Text>
          <View style={styles.field}>
            <Text style={styles.prefix}>₹</Text>
            <TextInput
              style={styles.input}
              value={amount}
              onChangeText={setAmount}
              placeholder="0"
              placeholderTextColor={COLORS.faint}
              keyboardType="numeric"
            />
          </View>

          <Text style={[styles.label, { marginTop: 14 }]}>Billing cycle</Text>
          <View style={styles.segment}>
            {CYCLES.map((c) => {
              const sel = cycle === c.id;
              return (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.segItem, sel && styles.segItemActive]}
                  onPress={() => setCycle(c.id)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.segText, sel && { color: '#fff' }]}>{c.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.label, { marginTop: 14 }]}>Next renewal</Text>
          <View style={styles.field}>
            <TextInput
              style={styles.input}
              value={nextRenewal}
              onChangeText={setNextRenewal}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={COLORS.faint}
              maxLength={10}
            />
          </View>

          <TouchableOpacity style={styles.cta} onPress={submit} activeOpacity={0.9}>
            <Text style={styles.ctaText}>Save subscription</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: COLORS.hairline },
  title: { fontSize: 17, fontWeight: '800', color: COLORS.text },
  body: { padding: 18, paddingBottom: 40 },

  label: { fontSize: 11, fontWeight: '800', color: '#888888', letterSpacing: 0.66, textTransform: 'uppercase', marginBottom: 6 },
  field: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 12, paddingHorizontal: 14, height: 50, borderWidth: 0.5, borderColor: COLORS.hairline },
  prefix: { fontSize: 15, color: COLORS.subtext, marginRight: 6, fontWeight: '700' },
  input: { flex: 1, fontSize: 15, color: COLORS.text, fontWeight: '700' },

  segment: { flexDirection: 'row', backgroundColor: COLORS.card, borderRadius: 12, padding: 4, borderWidth: 0.5, borderColor: COLORS.hairline },
  segItem: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 9 },
  segItemActive: { backgroundColor: COLORS.primary },
  segText: { fontSize: 12.5, fontWeight: '800', color: COLORS.subtext },

  cta: { marginTop: 22, backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  ctaText: { color: '#fff', fontWeight: '800', fontSize: 14 },
});
