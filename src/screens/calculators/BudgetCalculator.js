import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { COLORS, CATEGORY, MONO_STYLE } from '../../constants/colors';
import CalcHeader from '../../components/CalcHeader';
import AdBanner from '../../components/AdBanner';
import StorageService from '../../services/StorageService';
import AdsService from '../../services/AdsService';
import { calculateBudget } from '../../utils/calculations';
import { formatINR, formatINRFull } from '../../utils/formatters';

const CALC_ID = 'budget';
const ACCENT  = CATEGORY.orange.c;
const SOFT    = CATEGORY.orange.soft;

const STEP = 5000;
const MIN  = 5000;
const MAX  = 1_000_000;

export default function BudgetCalculator({ navigation }) {
  const [income, setIncome] = useState(85000);

  useEffect(() => {
    StorageService.getCalculatorInputs(CALC_ID).then((s) => {
      if (s?.income) setIncome(Number(s.income) || 85000);
    });
  }, []);

  useEffect(() => {
    StorageService.saveCalculatorInputs(CALC_ID, { income });
  }, [income]);

  const { needs, wants, savings } = calculateBudget(income);

  // Donut math (3 segments)
  const R = 60;
  const C = 2 * Math.PI * R;
  const sizes = { needs: 0.5, wants: 0.3, savings: 0.2 };
  // 5-year SIP projection of savings at 12%
  const r = 12 / 12 / 100;
  const n = 5 * 12;
  const fv5 = savings * ((Math.pow(1 + r, n) - 1) / r) * (1 + r);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <CalcHeader
        title="Budget · 50 / 30 / 20"
        subtitle="Smart income allocation"
        icon="pie-chart"
        accent={ACCENT}
        accentSoft={SOFT}
        onBack={() => { AdsService.maybeShowInterstitial(); navigation.goBack(); }}
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          {/* Income stepper */}
          <View style={styles.incomeCard}>
            <Text style={styles.incomeLabel}>MONTHLY INCOME</Text>
            <View style={styles.incomeRow}>
              <Text style={styles.incomeValue}>{formatINRFull(income)}</Text>
              <View style={styles.stepperRow}>
                <TouchableOpacity
                  style={[styles.stepper, { backgroundColor: COLORS.background }]}
                  onPress={() => setIncome((v) => Math.max(MIN, v - STEP))}
                  activeOpacity={0.7}
                >
                  <Ionicons name="remove" size={18} color={COLORS.text} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.stepper, { backgroundColor: ACCENT }]}
                  onPress={() => setIncome((v) => Math.min(MAX, v + STEP))}
                  activeOpacity={0.7}
                >
                  <Ionicons name="add" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Donut + breakdown */}
          <View style={styles.donutCard}>
            <Svg width={160} height={160} viewBox="0 0 160 160">
              <Circle cx="80" cy="80" r={R} fill="none" stroke={COLORS.background} strokeWidth="20" />
              {/* needs (50%) */}
              <Circle
                cx="80" cy="80" r={R} fill="none"
                stroke={CATEGORY.orange.c} strokeWidth="20"
                strokeDasharray={`${C * sizes.needs} ${C}`}
                transform="rotate(-90 80 80)"
              />
              {/* wants (30%) */}
              <Circle
                cx="80" cy="80" r={R} fill="none"
                stroke={CATEGORY.amber.c} strokeWidth="20"
                strokeDasharray={`${C * sizes.wants} ${C}`}
                strokeDashoffset={`${-C * sizes.needs}`}
                transform="rotate(-90 80 80)"
              />
              {/* savings (20%) */}
              <Circle
                cx="80" cy="80" r={R} fill="none"
                stroke={COLORS.primary} strokeWidth="20"
                strokeDasharray={`${C * sizes.savings} ${C}`}
                strokeDashoffset={`${-C * (sizes.needs + sizes.wants)}`}
                transform="rotate(-90 80 80)"
              />
            </Svg>
            <View style={styles.legendCol}>
              <BudgetRow color={CATEGORY.orange.c} pct="50%" label="Needs"   value={formatINR(needs)} />
              <BudgetRow color={CATEGORY.amber.c}  pct="30%" label="Wants"   value={formatINR(wants)} />
              <BudgetRow color={COLORS.primary}    pct="20%" label="Savings" value={formatINR(savings)} />
            </View>
          </View>

          {/* Recommendation card */}
          <View style={styles.recCard}>
            <View style={[styles.recIcon, { backgroundColor: COLORS.primary }]}>
              <Ionicons name="checkmark" size={16} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.recTitle}>Allocation looks healthy</Text>
              <Text style={styles.recBody}>
                Routing your {formatINR(savings)} monthly save into a SIP at 12% could grow to{' '}
                <Text style={{ fontWeight: '700' }}>{formatINR(fv5)}</Text> in 5 yrs.
              </Text>
            </View>
          </View>

          <AdBanner style={{ marginTop: 18 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function BudgetRow({ color, pct, label, value }) {
  return (
    <View style={styles.row}>
      <View style={[styles.rowBar, { backgroundColor: color }]} />
      <View style={{ flex: 1 }}>
        <View style={styles.rowHead}>
          <Text style={styles.rowLabel}>{label}</Text>
          <Text style={styles.rowPct}>{pct}</Text>
        </View>
        <Text style={styles.rowValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  body: { padding: 18, paddingBottom: 40 },

  incomeCard: {
    backgroundColor: COLORS.card, borderRadius: 20, padding: 16, marginBottom: 14,
    borderWidth: 1, borderColor: COLORS.border, ...COLORS.shadowSoft,
  },
  incomeLabel: {
    fontSize: 10.5, color: COLORS.subtext, fontWeight: '700', letterSpacing: 0.5,
  },
  incomeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  incomeValue: {
    ...MONO_STYLE,
    flex: 1, fontSize: 26, fontWeight: '700', color: COLORS.text, letterSpacing: -0.5,
  },
  stepperRow: { flexDirection: 'row', gap: 6 },
  stepper: {
    width: 36, height: 36, borderRadius: 11,
    justifyContent: 'center', alignItems: 'center',
  },

  donutCard: {
    backgroundColor: COLORS.card, borderRadius: 22,
    padding: 16, flexDirection: 'row', alignItems: 'center', gap: 16,
    borderWidth: 1, borderColor: COLORS.border, ...COLORS.shadowSoft,
  },
  legendCol: { flex: 1, gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowBar: { width: 8, height: 32, borderRadius: 4 },
  rowHead: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  rowLabel: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  rowPct: { fontSize: 10, fontWeight: '600', color: COLORS.subtext },
  rowValue: {
    ...MONO_STYLE,
    fontSize: 13, fontWeight: '700', color: COLORS.text, marginTop: 1,
  },

  recCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: COLORS.primarySoft, borderRadius: 18, padding: 14, marginTop: 14,
    borderWidth: 1, borderColor: 'rgba(11,93,59,0.14)',
  },
  recIcon: {
    width: 28, height: 28, borderRadius: 9,
    justifyContent: 'center', alignItems: 'center',
  },
  recTitle: { fontSize: 13, fontWeight: '700', color: COLORS.primaryDeep },
  recBody: { fontSize: 11, color: COLORS.text2, marginTop: 3, lineHeight: 16 },
});
