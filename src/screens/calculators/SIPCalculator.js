import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, CATEGORY, MONO_STYLE } from '../../constants/colors';
import CalcHeader from '../../components/CalcHeader';
import SliderField from '../../components/SliderField';
import PrimaryButton from '../../components/PrimaryButton';
import AdBanner from '../../components/AdBanner';
import StorageService from '../../services/StorageService';
import AdsService from '../../services/AdsService';
import { calculateSIP } from '../../utils/calculations';
import { formatINR, formatINRFull } from '../../utils/formatters';

const CALC_ID = 'sip';
const ACCENT  = CATEGORY.green.c;
const SOFT    = CATEGORY.green.soft;

export default function SIPCalculator({ navigation }) {
  const [monthly, setMonthly] = useState(15000);
  const [rate,    setRate]    = useState(12);
  const [years,   setYears]   = useState(15);

  useEffect(() => {
    StorageService.getCalculatorInputs(CALC_ID).then((s) => {
      if (s) {
        if (s.monthly != null) setMonthly(Number(s.monthly) || 15000);
        if (s.rate != null)    setRate(Number(s.rate) || 12);
        if (s.years != null)   setYears(Number(s.years) || 15);
      }
    });
  }, []);

  const result = calculateSIP(monthly, rate, years);
  const invested = monthly * 12 * years;
  const returns = result.futureValue - invested;
  const wealthRatio = (result.futureValue / invested).toFixed(2);

  const onCalculate = () => {
    StorageService.saveCalculatorInputs(CALC_ID, { monthly, rate, years });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <CalcHeader
        title="SIP Calculator"
        subtitle="Systematic Investment Plan"
        icon="trending-up"
        accent={ACCENT}
        accentSoft={SOFT}
        onBack={() => { AdsService.maybeShowInterstitial(); navigation.goBack(); }}
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          <View style={{ gap: 12 }}>
            <SliderField
              label="Monthly Investment"
              value={formatINRFull(monthly)}
              range="₹500 – ₹1L"
              v={monthly} min={500} max={100000} step={500}
              accent={ACCENT} onChange={setMonthly}
            />
            <SliderField
              label="Expected Return"
              value={`${rate.toFixed(1)} %`}
              range="1% – 30%"
              v={rate} min={1} max={30} step={0.5}
              accent={ACCENT} onChange={setRate}
            />
            <SliderField
              label="Duration"
              value={`${years} years`}
              range="1 – 40 yrs"
              v={years} min={1} max={40} step={1}
              accent={ACCENT} onChange={setYears}
            />
          </View>

          {/* Live preview card */}
          <View style={styles.previewCard}>
            <View style={styles.previewRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.previewLabel}>ESTIMATED MATURITY</Text>
                <Text style={styles.previewValue}>{formatINR(result.futureValue)}</Text>
              </View>
              <View style={[styles.previewIcon, { backgroundColor: SOFT }]}>
                <Ionicons name="sparkles" size={22} color={ACCENT} />
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.previewSplit}>
              <SmallStat label="Total invested" value={formatINR(invested)} />
              <SmallStat label="Est. returns" value={formatINR(returns)} color={ACCENT} />
            </View>

            <View style={[styles.ratioPill, { backgroundColor: SOFT }]}>
              <Ionicons name="trending-up" size={12} color={ACCENT} />
              <Text style={[styles.ratioText, { color: ACCENT }]}>
                {wealthRatio}× wealth ratio over {years} yrs
              </Text>
            </View>
          </View>

          <PrimaryButton
            title="See detailed breakdown"
            iconRight="arrow-forward"
            onPress={onCalculate}
            style={{ marginTop: 16 }}
          />

          <AdBanner style={{ marginTop: 18 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function SmallStat({ label, value, color = COLORS.text }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.smallLabel}>{label.toUpperCase()}</Text>
      <Text style={[styles.smallValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  body: { padding: 18, paddingBottom: 40 },

  previewCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20, padding: 16, marginTop: 16,
    borderWidth: 1, borderColor: COLORS.border,
    ...COLORS.shadowSoft,
  },
  previewRow: { flexDirection: 'row', alignItems: 'center' },
  previewLabel: {
    fontSize: 10.5, color: COLORS.subtext, fontWeight: '700',
    letterSpacing: 0.5, textTransform: 'uppercase',
  },
  previewValue: {
    ...MONO_STYLE,
    fontSize: 26, fontWeight: '700', color: COLORS.text, marginTop: 4, letterSpacing: -0.6,
  },
  previewIcon: {
    width: 54, height: 54, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
  },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 14 },
  previewSplit: { flexDirection: 'row', gap: 12 },
  smallLabel: {
    fontSize: 9.5, color: COLORS.subtext, fontWeight: '700', letterSpacing: 0.4,
  },
  smallValue: {
    ...MONO_STYLE,
    fontSize: 15, fontWeight: '700', marginTop: 3,
  },
  ratioPill: {
    alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, marginTop: 14,
  },
  ratioText: { fontSize: 11, fontWeight: '700' },
});
