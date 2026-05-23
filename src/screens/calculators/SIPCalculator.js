import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, CATEGORY, MONO_STYLE } from '../../constants/colors';
import CalcHeader from '../../components/CalcHeader';
import InputField from '../../components/InputField';
import PrimaryButton from '../../components/PrimaryButton';
import AdBanner from '../../components/AdBanner';
import StorageService from '../../services/StorageService';
import AdsService from '../../services/AdsService';
import { calculateSIP } from '../../utils/calculations';
import { formatINR, formatINRFull } from '../../utils/formatters';

const CALC_ID = 'sip';
const ACCENT  = CATEGORY.green.c;
const SOFT    = CATEGORY.green.soft;

const num = (s, f = 0) => {
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : f;
};

export default function SIPCalculator({ navigation, route }) {
  const [monthly, setMonthly] = useState('15000');
  const [rate,    setRate]    = useState('12');
  const [years,   setYears]   = useState('15');
  const [prefill, setPrefill] = useState(null);  // { source: 'fund'|'surplus', label: '...' }

  useEffect(() => {
    StorageService.getCalculatorInputs(CALC_ID).then((s) => {
      if (s) {
        if (s.monthly != null) setMonthly(String(s.monthly));
        if (s.rate    != null) setRate(String(s.rate));
        if (s.years   != null) setYears(String(s.years));
      }
    });
  }, []);

  // Cross-app prefills: from a Stock Lens MF (rate = CAGR) or the
  // dashboard "available to invest" surplus button (monthly amount).
  useEffect(() => {
    const fund = route?.params?.fund;
    const prefillAmount = route?.params?.prefillAmount;
    if (fund && typeof fund.cagr === 'number') {
      setRate(String(Math.round(fund.cagr * 10) / 10));
      setPrefill({ source: 'fund', label: `Rate filled from ${fund.name || fund.symbol}` });
    }
    if (typeof prefillAmount === 'number' && prefillAmount > 0) {
      setMonthly(String(Math.round(prefillAmount)));
      setPrefill((p) => p || { source: 'surplus', label: `Investing your monthly surplus of ₹${prefillAmount.toLocaleString('en-IN')}` });
    }
  }, [route?.params?.fund, route?.params?.prefillAmount]);

  useEffect(() => {
    StorageService.saveCalculatorInputs(CALC_ID, { monthly, rate, years });
  }, [monthly, rate, years]);

  const mVal = num(monthly);
  const rVal = num(rate);
  const yVal = num(years);

  const result = calculateSIP(mVal, rVal, yVal);
  const invested = mVal * 12 * yVal;
  const returns = result.futureValue - invested;
  const wealthRatio = invested > 0 ? (result.futureValue / invested).toFixed(2) : '0.00';

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
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {prefill && (
            <View style={styles.prefillBanner}>
              <Ionicons name="link" size={13} color={ACCENT} />
              <Text style={styles.prefillText}>{prefill.label}</Text>
            </View>
          )}
          <View style={styles.card}>
            <InputField
              label="Monthly Investment"
              value={monthly}
              onChangeText={setMonthly}
              prefix="₹"
              placeholder="15000"
            />
            <InputField
              label="Expected Return"
              value={rate}
              onChangeText={setRate}
              suffix="% p.a."
              placeholder="12"
            />
            <InputField
              label="Duration"
              value={years}
              onChangeText={setYears}
              suffix="years"
              placeholder="15"
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
                {wealthRatio}× wealth ratio over {yVal} yrs
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

  prefillBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: SOFT, paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 10, marginBottom: 12,
  },
  prefillText: { fontSize: 11.5, color: ACCENT, fontWeight: '800' },

  card: {
    backgroundColor: COLORS.card, borderRadius: 18, padding: 14,
    borderWidth: 1, borderColor: COLORS.border, ...COLORS.shadowSoft,
  },

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
