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
import { calculateLumpsum } from '../../utils/calculations';

const CALC_ID = 'lumpsum';
const ACCENT  = '#FF6D00';

const DEFAULTS = { principal: '', rate: '12', years: '10' };

export default function LumpsumCalculator({ navigation }) {
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
    const p = parseFloat(inputs.principal);
    const r = parseFloat(inputs.rate);
    const y = parseFloat(inputs.years);
    if (!p || p <= 0 || p > 100_000_000) e.principal = 'Enter ₹1 – ₹10 Crore';
    if (!r || r < 0.1 || r > 30)        e.rate      = 'Rate must be 0.1% – 30%';
    if (!y || y < 1 || y > 40)          e.years     = 'Duration must be 1 – 40 years';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const calculate = async () => {
    if (!validate()) return;
    setLoading(true);
    fadeAnim.setValue(0); slideAnim.setValue(30);
    await new Promise((r) => setTimeout(r, 600));

    const res = calculateLumpsum(
      parseFloat(inputs.principal),
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

  const cagr = result
    ? (Math.pow(result.futureValue / result.invested, 1 / parseFloat(inputs.years)) - 1) * 100
    : null;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Lumpsum Calculator</Text>
        <View style={[styles.badge, { backgroundColor: ACCENT + '20' }]}>
          <Ionicons name="cash" size={16} color={ACCENT} />
        </View>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Investment Details</Text>
            <InputField
              label="Investment Amount"
              value={inputs.principal}
              onChangeText={set('principal')}
              prefix="₹"
              placeholder="e.g. 100000"
              error={errors.principal}
            />
            <InputField
              label="Expected Annual Return"
              value={inputs.rate}
              onChangeText={set('rate')}
              suffix="% p.a."
              placeholder="12"
              error={errors.rate}
            />
            <InputField
              label="Investment Duration"
              value={inputs.years}
              onChangeText={set('years')}
              suffix="years"
              placeholder="10"
              error={errors.years}
            />
          </View>

          <PrimaryButton
            title="Calculate Returns"
            onPress={calculate}
            loading={loading}
            gradient={[ACCENT, '#E65100']}
          />

          {result && (
            <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
              <DonutChart
                data={[
                  { label: 'Principal', value: result.invested, color: COLORS.primary },
                  { label: 'Returns',   value: result.returns,  color: ACCENT },
                ]}
                centerValue={result.futureValue}
                centerLabel="Maturity Value"
              />
              <ResultCard
                accentColor={ACCENT}
                data={[
                  { label: 'Principal',      value: result.invested,    color: COLORS.text },
                  { label: 'Est. Returns',   value: result.returns,     color: ACCENT },
                  { label: 'Maturity Value', value: result.futureValue, color: COLORS.primary },
                ]}
              />
              <View style={styles.cagrBox}>
                <Text style={styles.cagrLabel}>CAGR</Text>
                <Text style={[styles.cagrValue, { color: ACCENT }]}>{cagr?.toFixed(2)}%</Text>
                <Text style={styles.cagrHint}>Compounded Annual Growth Rate</Text>
              </View>
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
  headerTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  badge: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  body: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: COLORS.card, borderRadius: 16, padding: 16, marginBottom: 14, ...COLORS.shadow,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 14 },
  cagrBox: {
    backgroundColor: COLORS.card, borderRadius: 16, padding: 16, marginTop: 12,
    alignItems: 'center', ...COLORS.shadow,
  },
  cagrLabel: { fontSize: 12, color: COLORS.subtext, fontWeight: '600', marginBottom: 4 },
  cagrValue: { fontSize: 32, fontWeight: '800' },
  cagrHint: { fontSize: 12, color: COLORS.subtext, marginTop: 4 },
});
