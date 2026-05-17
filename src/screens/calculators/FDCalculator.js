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
import AdBanner from '../../components/AdBanner';
import StorageService from '../../services/StorageService';
import AdsService from '../../services/AdsService';
import { calculateFD } from '../../utils/calculations';

const CALC_ID = 'fd';
const ACCENT  = '#0097A7';

const COMPOUNDING_OPTIONS = [
  { label: 'Monthly',    value: 12 },
  { label: 'Quarterly',  value: 4  },
  { label: 'Annually',   value: 1  },
];

const DEFAULTS = { principal: '', rate: '7', years: '3', compounding: 4 };

export default function FDCalculator({ navigation }) {
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
    if (!r || r < 0.1 || r > 20)        e.rate      = 'Rate must be 0.1% – 20%';
    if (!y || y < 0.25 || y > 10)       e.years     = 'Duration must be 3 months – 10 years';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const calculate = async () => {
    if (!validate()) return;
    setLoading(true);
    fadeAnim.setValue(0); slideAnim.setValue(30);
    await new Promise((r) => setTimeout(r, 600));

    const res = calculateFD(
      parseFloat(inputs.principal),
      parseFloat(inputs.rate),
      parseFloat(inputs.years),
      inputs.compounding,
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
        <TouchableOpacity onPress={() => { AdsService.maybeShowInterstitial(); navigation.goBack(); }} style={styles.back}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>FD Calculator</Text>
        <View style={[styles.badge, { backgroundColor: ACCENT + '20' }]}>
          <Ionicons name="business" size={16} color={ACCENT} />
        </View>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>FD Details</Text>
            <InputField
              label="Deposit Amount"
              value={inputs.principal}
              onChangeText={set('principal')}
              prefix="₹"
              placeholder="e.g. 100000"
              error={errors.principal}
            />
            <InputField
              label="Annual Interest Rate"
              value={inputs.rate}
              onChangeText={set('rate')}
              suffix="% p.a."
              placeholder="7"
              error={errors.rate}
            />
            <InputField
              label="Duration"
              value={inputs.years}
              onChangeText={set('years')}
              suffix="years"
              placeholder="3"
              error={errors.years}
            />

            {/* Compounding selector */}
            <Text style={styles.segLabel}>Compounding Frequency</Text>
            <View style={styles.segRow}>
              {COMPOUNDING_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.segBtn,
                    inputs.compounding === opt.value && {
                      backgroundColor: ACCENT,
                      borderColor: ACCENT,
                    },
                  ]}
                  onPress={() => set('compounding')(opt.value)}
                >
                  <Text
                    style={[
                      styles.segText,
                      inputs.compounding === opt.value && { color: '#fff' },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <PrimaryButton
            title="Calculate Maturity"
            onPress={calculate}
            loading={loading}
            gradient={[ACCENT, '#006064']}
          />

          {result && (
            <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
              <DonutChart
                data={[
                  { label: 'Principal', value: result.invested, color: COLORS.primary },
                  { label: 'Interest',  value: result.returns,  color: ACCENT },
                ]}
                centerValue={result.futureValue}
                centerLabel="Maturity Amount"
              />
              <ResultCard
                accentColor={ACCENT}
                data={[
                  { label: 'Principal',    value: result.invested,    color: COLORS.text },
                  { label: 'Interest',     value: result.returns,     color: ACCENT },
                  { label: 'Maturity Amt', value: result.futureValue, color: COLORS.primary },
                ]}
              />
            </Animated.View>
          )}

          <AdBanner style={{ marginTop: 18 }} />
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
  segLabel: { fontSize: 13, fontWeight: '600', color: COLORS.subtext, marginBottom: 8, letterSpacing: 0.2 },
  segRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  segBtn: {
    flex: 1, height: 38, borderRadius: 10, borderWidth: 1.5, borderColor: COLORS.border,
    justifyContent: 'center', alignItems: 'center',
  },
  segText: { fontSize: 13, fontWeight: '600', color: COLORS.subtext },
});
