import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, CATEGORY, MONO_STYLE } from '../../constants/colors';
import CalcHeader from '../../components/CalcHeader';
import SliderField from '../../components/SliderField';
import StorageService from '../../services/StorageService';
import { calculateEMI } from '../../utils/calculations';
import { formatINR, formatINRFull } from '../../utils/formatters';

const CALC_ID = 'emi';
const ACCENT  = CATEGORY.violet.c;
const SOFT    = CATEGORY.violet.soft;

export default function EMICalculator({ navigation }) {
  const [amount, setAmount] = useState(2500000);
  const [rate,   setRate]   = useState(8.5);
  const [years,  setYears]  = useState(20);

  useEffect(() => {
    StorageService.getCalculatorInputs(CALC_ID).then((s) => {
      if (s) {
        if (s.amount != null) setAmount(Number(s.amount) || 2500000);
        if (s.rate != null)   setRate(Number(s.rate) || 8.5);
        if (s.years != null)  setYears(Number(s.years) || 20);
      }
    });
  }, []);

  const months = years * 12;
  const res = calculateEMI(amount, rate, months);

  useEffect(() => {
    StorageService.saveCalculatorInputs(CALC_ID, { amount, rate, years });
  }, [amount, rate, years]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <CalcHeader
        title="EMI Calculator"
        subtitle="Loan repayment planner"
        icon="calculator"
        accent={ACCENT}
        accentSoft={SOFT}
        onBack={() => navigation.goBack()}
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          {/* Dark hero */}
          <LinearGradient
            colors={COLORS.gradientDark}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.7, y: 1 }}
            style={styles.hero}
          >
            <View style={styles.heroOrb} />
            <Text style={styles.heroLabel}>MONTHLY EMI</Text>
            <Text style={styles.heroValue}>{formatINRFull(res.emi)}</Text>
            <View style={styles.heroSplit}>
              <HeroStat label="Total interest" value={formatINR(res.totalInterest)} />
              <HeroStat label="Total payable"  value={formatINR(res.totalAmount)} />
            </View>
          </LinearGradient>

          <View style={{ gap: 12, marginTop: 4 }}>
            <SliderField
              label="Loan Amount"
              value={formatINRFull(amount)}
              range="₹1L – ₹2 Cr"
              v={amount} min={100000} max={20000000} step={50000}
              accent={ACCENT} onChange={setAmount}
            />
            <SliderField
              label="Interest Rate"
              value={`${rate.toFixed(2)} %`}
              range="1% – 25%"
              v={rate} min={1} max={25} step={0.25}
              accent={ACCENT} onChange={setRate}
            />
            <SliderField
              label="Tenure"
              value={`${years} years`}
              range="1 – 30 yrs"
              v={years} min={1} max={30} step={1}
              accent={ACCENT} onChange={setYears}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function HeroStat({ label, value }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.heroStatLabel}>{label.toUpperCase()}</Text>
      <Text style={styles.heroStatValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  body: { padding: 18, paddingBottom: 40 },

  hero: {
    borderRadius: 24, padding: 20, marginBottom: 16, overflow: 'hidden',
  },
  heroOrb: {
    position: 'absolute', right: -40, bottom: -40,
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: 'rgba(111,79,224,0.30)',
  },
  heroLabel: {
    fontSize: 10.5, fontWeight: '700', letterSpacing: 1.4,
    color: 'rgba(255,255,255,0.6)',
  },
  heroValue: {
    ...MONO_STYLE,
    fontSize: 36, fontWeight: '700', color: '#fff',
    marginTop: 6, letterSpacing: -1,
  },
  heroSplit: {
    flexDirection: 'row', gap: 12, marginTop: 14,
    paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.10)',
  },
  heroStatLabel: {
    fontSize: 9.5, color: 'rgba(255,255,255,0.55)', fontWeight: '600',
    letterSpacing: 0.4,
  },
  heroStatValue: {
    ...MONO_STYLE,
    fontSize: 15, fontWeight: '700', color: '#fff', marginTop: 3,
  },
});
