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
import BarChartComponent from '../../components/BarChartComponent';
import StorageService from '../../services/StorageService';
import { calculatePPF } from '../../utils/calculations';
import { formatINR } from '../../utils/formatters';

const CALC_ID = 'ppf';
const ACCENT  = '#388E3C';
const PPF_RATE = 7.1; // current government rate

const DEFAULTS = { yearly: '', years: '15' };

export default function PPFCalculator({ navigation }) {
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
    const y  = parseFloat(inputs.yearly);
    const yr = parseFloat(inputs.years);
    if (!y || y < 500 || y > 150_000)    e.yearly = 'Yearly deposit: ₹500 – ₹1,50,000';
    if (!yr || yr < 1 || yr > 15)        e.years  = 'Duration must be 1 – 15 years';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const calculate = async () => {
    if (!validate()) return;
    setLoading(true);
    fadeAnim.setValue(0); slideAnim.setValue(30);
    await new Promise((r) => setTimeout(r, 600));

    const res = calculatePPF(
      parseFloat(inputs.yearly),
      parseFloat(inputs.years),
      PPF_RATE,
    );
    setResult(res);
    setLoading(false);
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 9, useNativeDriver: true }),
    ]).start();
    StorageService.saveCalculatorInputs(CALC_ID, inputs);
  };

  // Prepare bar-chart data from yearlyData
  const barData = result?.yearlyData?.map((d) => ({
    label: `Y${d.year}`,
    value: d.balance,
  }));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>PPF Calculator</Text>
        <View style={[styles.badge, { backgroundColor: ACCENT + '20' }]}>
          <Ionicons name="shield-checkmark" size={16} color={ACCENT} />
        </View>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* Info banner */}
          <View style={[styles.infoBanner, { backgroundColor: ACCENT + '15' }]}>
            <Ionicons name="shield-checkmark" size={16} color={ACCENT} />
            <Text style={styles.infoText}>
              Current PPF interest rate: <Text style={{ fontWeight: '700' }}>{PPF_RATE}% p.a.</Text>
              {'\n'}Tax-free returns under EEE status (80C + exempt maturity)
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>PPF Investment Details</Text>
            <InputField
              label="Yearly Deposit"
              value={inputs.yearly}
              onChangeText={set('yearly')}
              prefix="₹"
              placeholder="e.g. 150000"
              error={errors.yearly}
            />
            <Text style={styles.hint}>Max allowed: ₹1,50,000 per year</Text>

            <InputField
              label="Investment Duration"
              value={inputs.years}
              onChangeText={set('years')}
              suffix="years (max 15)"
              placeholder="15"
              error={errors.years}
            />
          </View>

          <PrimaryButton
            title="Calculate PPF Returns"
            onPress={calculate}
            loading={loading}
            gradient={[ACCENT, '#1B5E20']}
          />

          {result && (
            <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
              <DonutChart
                data={[
                  { label: 'Invested', value: result.invested, color: COLORS.primary },
                  { label: 'Returns',  value: result.returns,  color: ACCENT },
                ]}
                centerValue={result.maturity}
                centerLabel="Maturity Amount"
              />
              <ResultCard
                accentColor={ACCENT}
                data={[
                  { label: 'Total Invested', value: result.invested, color: COLORS.text },
                  { label: 'Interest Earned',value: result.returns,  color: ACCENT },
                  { label: 'Maturity Amt',   value: result.maturity, color: COLORS.primary },
                ]}
              />
              <BarChartComponent
                data={barData}
                title="Year-wise Balance Growth"
                color={ACCENT}
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
  headerTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  badge: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  body: { padding: 16, paddingBottom: 40 },
  infoBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    borderRadius: 12, padding: 12, marginBottom: 14,
  },
  infoText: { fontSize: 12, color: COLORS.text, lineHeight: 18, flex: 1 },
  card: {
    backgroundColor: COLORS.card, borderRadius: 16, padding: 16, marginBottom: 14, ...COLORS.shadow,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 14 },
  hint: { fontSize: 11, color: COLORS.subtext, marginTop: -8, marginBottom: 12, marginLeft: 2 },
});
