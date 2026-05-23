import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { useApp } from '../context/AppContext';
import { calculateGoalSIP } from '../utils/calculations';

export default function AddGoalScreen({ navigation }) {
  const { addGoal } = useApp();
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [years, setYears] = useState('5');
  const [rate, setRate] = useState('12');

  const submit = async () => {
    if (!name.trim())                return Alert.alert('Enter a goal name');
    const t = parseFloat(target), y = parseFloat(years), r = parseFloat(rate);
    if (!t || t <= 0)                return Alert.alert('Enter a target amount');
    if (!y || y < 1 || y > 40)       return Alert.alert('Years must be 1–40');
    if (!r || r < 0.1 || r > 30)     return Alert.alert('Rate must be 0.1%–30%');
    const { monthlySIP } = calculateGoalSIP(t, y, r);
    await addGoal({
      name: name.trim(),
      targetAmount: t,
      target: t,
      years: y,
      rate: r,
      monthlySIP,
      saved: 0,
    });
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Add goal</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="close" size={22} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Field label="Goal name" value={name} onChangeText={setName} placeholder="Buy a car" autoFocus />
          <Field label="Target amount" value={target} onChangeText={setTarget} placeholder="1000000" keyboardType="numeric" prefix="₹" />
          <Field label="Years to reach" value={years} onChangeText={setYears} placeholder="5" keyboardType="numeric" suffix="yrs" />
          <Field label="Expected return" value={rate} onChangeText={setRate} placeholder="12" keyboardType="numeric" suffix="% p.a." />

          <TouchableOpacity style={styles.cta} onPress={submit} activeOpacity={0.9}>
            <Text style={styles.ctaText}>Save goal</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ label, prefix, suffix, ...rest }) {
  return (
    <View style={{ marginTop: 14 }}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.field}>
        {prefix ? <Text style={styles.affix}>{prefix}</Text> : null}
        <TextInput
          style={styles.input}
          placeholderTextColor={COLORS.faint}
          {...rest}
        />
        {suffix ? <Text style={styles.affix}>{suffix}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: COLORS.hairline },
  title: { fontSize: 17, fontWeight: '800', color: COLORS.text },
  body: { padding: 18, paddingBottom: 40 },

  label: { fontSize: 11, fontWeight: '800', color: '#888888', letterSpacing: 0.66, textTransform: 'uppercase', marginBottom: 6 },
  field: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 12, paddingHorizontal: 14, height: 50, borderWidth: 0.5, borderColor: COLORS.hairline },
  affix: { fontSize: 14, color: COLORS.subtext, fontWeight: '700' },
  input: { flex: 1, fontSize: 15, color: COLORS.text, fontWeight: '700', paddingHorizontal: 6 },

  cta: { marginTop: 24, backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  ctaText: { color: '#fff', fontWeight: '800', fontSize: 14 },
});
