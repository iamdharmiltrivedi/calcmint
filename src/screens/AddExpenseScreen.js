import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { EXPENSE_CATEGORIES } from '../constants/categories';
import { useApp } from '../context/AppContext';

const today = () => new Date().toISOString().split('T')[0];

// Modal screen presented from slide_from_bottom — the same look + feel
// as a bottom sheet but as a real route so deep links can land here.
export default function AddExpenseScreen({ navigation, route }) {
  const { addExpense } = useApp();
  const tripId = route?.params?.tripId || null;
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('food');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(today());

  const submit = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return Alert.alert('Enter an amount');
    await addExpense({
      amount: amt,
      categoryId,
      note: note.trim(),
      date: date || today(),
      ...(tripId ? { tripId } : {}),
    });
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Add expense</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="close" size={22} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          {tripId ? (
            <View style={styles.tripBanner}>
              <Ionicons name="airplane" size={14} color={COLORS.primary} />
              <Text style={styles.tripBannerText}>This expense will be added to the current trip.</Text>
            </View>
          ) : null}

          <Text style={styles.label}>Amount</Text>
          <View style={styles.field}>
            <Text style={styles.prefix}>₹</Text>
            <TextInput
              style={styles.input}
              value={amount}
              onChangeText={setAmount}
              placeholder="0"
              placeholderTextColor={COLORS.faint}
              keyboardType="numeric"
              autoFocus
            />
          </View>

          <Text style={[styles.label, { marginTop: 14 }]}>Date</Text>
          <View style={styles.field}>
            <TextInput
              style={styles.input}
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={COLORS.faint}
              maxLength={10}
            />
          </View>

          <Text style={[styles.label, { marginTop: 14 }]}>Category</Text>
          <View style={styles.catGrid}>
            {EXPENSE_CATEGORIES.map((cat) => {
              const sel = categoryId === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.catChip, sel && { backgroundColor: cat.color, borderColor: cat.color }]}
                  onPress={() => setCategoryId(cat.id)}
                >
                  <Text style={{ fontSize: 13 }}>{cat.emoji}</Text>
                  <Text style={[styles.catChipText, sel && { color: '#fff' }]}>{cat.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.label, { marginTop: 14 }]}>Note</Text>
          <View style={styles.field}>
            <TextInput
              style={styles.input}
              value={note}
              onChangeText={setNote}
              placeholder="What was this for?"
              placeholderTextColor={COLORS.faint}
              maxLength={80}
            />
          </View>

          <TouchableOpacity style={styles.cta} onPress={submit} activeOpacity={0.9}>
            <Text style={styles.ctaText}>Add ₹{amount || '0'}</Text>
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

  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 7,
    borderRadius: 999, borderWidth: 0.5, borderColor: COLORS.hairline,
    backgroundColor: COLORS.card,
  },
  catChipText: { fontSize: 11.5, fontWeight: '700', color: COLORS.text },

  cta: { marginTop: 22, backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  ctaText: { color: '#fff', fontWeight: '800', fontSize: 14 },

  tripBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.primarySoft, borderRadius: 10, padding: 10,
    marginBottom: 12,
  },
  tripBannerText: { flex: 1, fontSize: 12, color: COLORS.primary, fontWeight: '700' },
});
