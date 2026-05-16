import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Animated,
  KeyboardAvoidingView, Platform, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import InputField from '../../components/InputField';
import PrimaryButton from '../../components/PrimaryButton';
import ResultCard from '../../components/ResultCard';
import DonutChart from '../../components/DonutChart';
import StorageService from '../../services/StorageService';
import { calculateRD } from '../../utils/calculations';

const CALC_ID = 'rd';
const ACCENT  = '#5D4037';

const DEFAULTS = { monthly: '', rate: '6.5', years: '2' };

export default function RDCalculator({ navigation }) {
  const [inputs, setInputs]   = useState(DEFAULTS);
  const [errors, setErrors]   = useState({});
  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(false);
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    StorageService.getCalculatorInputs(CALC_ID).then((s) => { if (s) setInputs(s); });
  }, []);

  const set = (key) => (val) => setInputs((p) => ({ ...p, [key]: val }));

  const validate = () => {
    const e = {};
    const m = parseFloat(inputs.monthly);
    const r = parseFloat(inputs.rate);
    const y = parseFloat(inputs.years);
    if (!m || m <= 0 || m > 10_000_000) e.monthly = 'Enter ₹1 – ₹1 Crore';
    if (!r || r < 0.1 || r > 20)       e.rate    = 'Rate must be 0.1% – 20%';
    if (!y || y < 0.5 || y > 10)       e.years   = 'Duration must be 6 months – 10 years';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const calculate = async () => {
    if (!validate()) return;
    setLoading(true);
    fadeAnim.setValue(0); slideAnim.setValue(30);
    await new Promise((r) => setTimeout(r, 600));

    const res = calculateRD(
      parseFloat(inputs.monthly),
      parseFloat(inputs.rate),
      parseFloat(inputs.years),
    );
    setResult(res);
    setLoading(false);
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 9, useNativeDriver: true }),
    ]).start();
    StorageService.saveCalculatorInputs(CALC_ID, inputs);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Recurring Deposit Calculator</Text>
        <View style={[styles.badge, { backgroundColor: ACCENT + '20' }]}>
          <Ionicons name="repeat" size={16} color={ACCENT} />
        </View>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>RD Details</Text>
            <InputField
              label="Monthly Deposit"
              value={inputs.monthly}
              onChangeText={set('monthly')}
              prefix="₹"
              placeholder="e.g. 5000"
              error={errors.monthly}
            />
            <InputField
              label="Annual Interest Rate"
              value={inputs.rate}
              onChangeText={set('rate')}
              suffix="% p.a."
              placeholder="6.5"
              error={errors.rate}
            />
            <InputField
              label="Duration"
              value={inputs.years}
              onChangeText={set('years')}
              suffix="years"
              placeholder="2"
              error={errors.years}
            />

            <View style={styles.infoBox}>
              <Ionicons name="information-circle" size={15} color={ACCENT} />
              <Text style={styles.infoText}>
                RD interest is compounded quarterly in most Indian banks.
              </Text>
            </View>
          </View>

          <PrimaryButton
            title="Calculate Maturity"
            onPress={calculate}
            loading={loading}
            gradient={[ACCENT, '#3E2723']}
          />

          {result && (
            <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
              <DonutChart
                data={[
                  { label: 'Deposited', value: result.invested, color: COLORS.primary },
                  { label: 'Interest',  value: result.returns,  color: ACCENT },
                ]}
                centerValue={result.maturity}
                centerLabel="Maturity Amount"
              />
              <ResultCard
                accentColor={ACCENT}
                data={[
                  { label: 'Total Deposited', value: result.invested, color: COLORS.text },
                  { label: 'Interest Earned', value: result.returns,  color: ACCENT },
                  { label: 'Maturity Amt',    value: result.maturity, color: COLORS.primary },
                ]}
              />
            </Animated.View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: COLORS.card, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  back: { padding: 4 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, flex: 1, textAlign: 'center' },
  badge: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  body: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: COLORS.card, borderRadius: 16, padding: 16, marginBottom: 14, ...COLORS.shadow,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 14 },
  infoBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    backgroundColor: ACCENT + '10', borderRadius: 10, padding: 10, marginTop: 4,
  },
  infoText: { fontSize: 12, color: COLORS.subtext, flex: 1, lineHeight: 18 },
});
