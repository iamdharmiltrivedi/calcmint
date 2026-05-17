import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, KeyboardAvoidingView, Platform,
  TouchableOpacity, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, CATEGORY, MONO_STYLE } from '../../constants/colors';
import CalcHeader from '../../components/CalcHeader';
import SliderField from '../../components/SliderField';
import AdBanner from '../../components/AdBanner';
import ShareableCard from '../../components/ShareableCard';
import StorageService from '../../services/StorageService';
import AdsService from '../../services/AdsService';
import ShareService from '../../services/ShareService';
import { formatINR, formatINRFull } from '../../utils/formatters';

const CALC_ID = 'retirement';
const ACCENT = CATEGORY.indigo.c;
const SOFT   = CATEGORY.indigo.soft;

// Inputs:
//   currentAge, retireAge, lifeExpectancy
//   currentMonthlyExpense (today's terms)
//   inflation (% p.a.)
//   preReturn  (expected return % until retirement)
//   postReturn (expected return % after retirement, lower because lower risk)
//   currentSavings (lumpsum already saved)
//
// Output:
//   futureMonthlyExpense (at retirement, inflation-adjusted)
//   requiredCorpus (so that withdrawals cover years between retire & life expectancy)
//   monthlySIPNeeded (to reach requiredCorpus accounting for currentSavings growth)
function plan({
  currentAge, retireAge, lifeExpectancy,
  currentMonthlyExpense, inflation,
  preReturn, postReturn, currentSavings,
}) {
  const yearsToRetire   = Math.max(0, retireAge - currentAge);
  const yearsInRetire   = Math.max(0, lifeExpectancy - retireAge);
  const futureMonthly   = currentMonthlyExpense * Math.pow(1 + inflation / 100, yearsToRetire);
  const annualNeed      = futureMonthly * 12;

  // Real (inflation-adjusted) post-retirement return
  const realPost = ((1 + postReturn / 100) / (1 + inflation / 100)) - 1;
  // PV of annuity-due (start of period withdrawals)
  let requiredCorpus;
  if (Math.abs(realPost) < 1e-6) {
    requiredCorpus = annualNeed * yearsInRetire;
  } else {
    requiredCorpus = annualNeed * (1 - Math.pow(1 + realPost, -yearsInRetire)) / realPost;
  }

  // Future value of current savings at retirement
  const fvCurrent = currentSavings * Math.pow(1 + preReturn / 100, yearsToRetire);
  const gap = Math.max(0, requiredCorpus - fvCurrent);

  // Monthly SIP needed for the gap
  const monthlyRate = preReturn / 12 / 100;
  const n = yearsToRetire * 12;
  let monthlySIP;
  if (n === 0) {
    monthlySIP = gap; // already at retirement
  } else if (Math.abs(monthlyRate) < 1e-9) {
    monthlySIP = gap / n;
  } else {
    monthlySIP = gap * monthlyRate / (Math.pow(1 + monthlyRate, n) - 1);
  }

  return {
    yearsToRetire, yearsInRetire,
    futureMonthly, annualNeed,
    requiredCorpus, fvCurrent, gap, monthlySIP,
  };
}

export default function RetirementCalculator({ navigation }) {
  const [currentAge,            setCurrentAge]            = useState(30);
  const [retireAge,             setRetireAge]             = useState(60);
  const [lifeExpectancy,        setLifeExpectancy]        = useState(85);
  const [currentMonthlyExpense, setCurrentMonthlyExpense] = useState(40000);
  const [inflation,             setInflation]             = useState(6);
  const [preReturn,             setPreReturn]             = useState(12);
  const [postReturn,            setPostReturn]            = useState(7);
  const [currentSavings,        setCurrentSavings]        = useState(500000);

  useEffect(() => {
    StorageService.getCalculatorInputs(CALC_ID).then((s) => {
      if (!s) return;
      if (s.currentAge            != null) setCurrentAge(Number(s.currentAge));
      if (s.retireAge             != null) setRetireAge(Number(s.retireAge));
      if (s.lifeExpectancy        != null) setLifeExpectancy(Number(s.lifeExpectancy));
      if (s.currentMonthlyExpense != null) setCurrentMonthlyExpense(Number(s.currentMonthlyExpense));
      if (s.inflation             != null) setInflation(Number(s.inflation));
      if (s.preReturn             != null) setPreReturn(Number(s.preReturn));
      if (s.postReturn            != null) setPostReturn(Number(s.postReturn));
      if (s.currentSavings        != null) setCurrentSavings(Number(s.currentSavings));
    });
  }, []);

  useEffect(() => {
    StorageService.saveCalculatorInputs(CALC_ID, {
      currentAge, retireAge, lifeExpectancy,
      currentMonthlyExpense, inflation, preReturn, postReturn, currentSavings,
    });
  }, [currentAge, retireAge, lifeExpectancy, currentMonthlyExpense, inflation, preReturn, postReturn, currentSavings]);

  const res = plan({
    currentAge, retireAge, lifeExpectancy,
    currentMonthlyExpense, inflation, preReturn, postReturn, currentSavings,
  });

  const cardRef = useRef(null);
  const onShare = async () => {
    try { await ShareService.shareCard(cardRef); }
    catch (e) { Alert.alert('Sharing not available', e.message); }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <CalcHeader
        title="Retirement Planner"
        subtitle="How much will you need?"
        icon="bed-outline"
        accent={ACCENT}
        accentSoft={SOFT}
        onBack={() => { AdsService.maybeShowInterstitial(); navigation.goBack(); }}
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          <LinearGradient colors={COLORS.gradientDark} style={styles.hero}>
            <View style={styles.heroOrb} />
            <TouchableOpacity style={styles.shareBtn} onPress={onShare} activeOpacity={0.8}>
              <Ionicons name="share-outline" size={16} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.heroLabel}>YOU WILL NEED</Text>
            <Text style={styles.heroValue}>{formatINRFull(res.requiredCorpus)}</Text>
            <Text style={styles.heroHint}>
              by age {retireAge} to maintain today's lifestyle until age {lifeExpectancy}.
            </Text>
            <View style={styles.heroSplit}>
              <HeroStat label="Monthly SIP needed" value={formatINRFull(res.monthlySIP)} />
              <HeroStat label="Today equivalent" value={formatINR(currentMonthlyExpense * 12)} />
            </View>
          </LinearGradient>

          <View style={styles.statsRow}>
            <StatCard label="Future monthly expense" value={formatINR(res.futureMonthly)} hint={`at age ${retireAge}`} />
            <StatCard label="Existing savings grow to" value={formatINR(res.fvCurrent)} hint={`in ${res.yearsToRetire} yrs`} />
          </View>

          <View style={{ gap: 12, marginTop: 4 }}>
            <SliderField
              label="Current age"
              value={`${currentAge} yrs`}
              range="18 – 70"
              v={currentAge} min={18} max={70} step={1}
              accent={ACCENT} onChange={(v) => { setCurrentAge(v); if (retireAge <= v) setRetireAge(v + 1); }}
            />
            <SliderField
              label="Retirement age"
              value={`${retireAge} yrs`}
              range="40 – 75"
              v={retireAge} min={Math.max(currentAge + 1, 40)} max={75} step={1}
              accent={ACCENT} onChange={setRetireAge}
            />
            <SliderField
              label="Life expectancy"
              value={`${lifeExpectancy} yrs`}
              range="65 – 100"
              v={lifeExpectancy} min={Math.max(retireAge + 1, 65)} max={100} step={1}
              accent={ACCENT} onChange={setLifeExpectancy}
            />
            <SliderField
              label="Current monthly expense"
              value={formatINRFull(currentMonthlyExpense)}
              range="₹10k – ₹5L"
              v={currentMonthlyExpense} min={10000} max={500000} step={5000}
              accent={ACCENT} onChange={setCurrentMonthlyExpense}
            />
            <SliderField
              label="Inflation"
              value={`${inflation.toFixed(1)} %`}
              range="2% – 12%"
              v={inflation} min={2} max={12} step={0.5}
              accent={ACCENT} onChange={setInflation}
            />
            <SliderField
              label="Pre-retirement return"
              value={`${preReturn.toFixed(1)} %`}
              range="4% – 18%"
              v={preReturn} min={4} max={18} step={0.5}
              accent={ACCENT} onChange={setPreReturn}
            />
            <SliderField
              label="Post-retirement return"
              value={`${postReturn.toFixed(1)} %`}
              range="3% – 12%"
              v={postReturn} min={3} max={12} step={0.5}
              accent={ACCENT} onChange={setPostReturn}
            />
            <SliderField
              label="Current savings"
              value={formatINRFull(currentSavings)}
              range="₹0 – ₹5 Cr"
              v={currentSavings} min={0} max={50000000} step={50000}
              accent={ACCENT} onChange={setCurrentSavings}
            />
          </View>

          <AdBanner style={{ marginTop: 18 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Off-screen card used only for the Share action */}
      <View style={styles.offscreen} pointerEvents="none">
        <ShareableCard
          ref={cardRef}
          title="RETIREMENT PLAN"
          value={formatINRFull(res.requiredCorpus)}
          subtitle={`What I need by age ${retireAge} to retire comfortably.`}
          rows={[
            { label: 'Monthly SIP needed', value: formatINRFull(res.monthlySIP) },
            { label: 'Years to retire',    value: `${res.yearsToRetire} yrs` },
            { label: 'Retirement spend',   value: formatINR(res.futureMonthly) + ' /mo' },
            { label: 'Existing savings →', value: formatINR(res.fvCurrent) },
          ]}
        />
      </View>
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

function StatCard({ label, value, hint }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statHint}>{hint}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  body: { padding: 18, paddingBottom: 40 },

  hero: { borderRadius: 24, padding: 20, marginBottom: 12, overflow: 'hidden' },
  heroOrb: {
    position: 'absolute', right: -40, bottom: -40,
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: 'rgba(31,79,168,0.30)',
  },
  heroLabel: { fontSize: 10.5, fontWeight: '700', letterSpacing: 1.4, color: 'rgba(255,255,255,0.6)' },
  heroValue: { ...MONO_STYLE, fontSize: 32, fontWeight: '700', color: '#fff', marginTop: 6, letterSpacing: -0.8 },
  heroHint: { fontSize: 12, color: 'rgba(255,255,255,0.72)', marginTop: 8, lineHeight: 18 },
  heroSplit: {
    flexDirection: 'row', gap: 12, marginTop: 14, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.10)',
  },
  heroStatLabel: { fontSize: 9.5, color: 'rgba(255,255,255,0.55)', fontWeight: '600', letterSpacing: 0.4 },
  heroStatValue: { ...MONO_STYLE, fontSize: 14, fontWeight: '700', color: '#fff', marginTop: 3 },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  statCard: {
    flex: 1, backgroundColor: COLORS.card, borderRadius: 14, padding: 12,
    borderWidth: 1, borderColor: COLORS.border,
  },
  statLabel: { fontSize: 10.5, color: COLORS.subtext, fontWeight: '700', letterSpacing: 0.3, textTransform: 'uppercase' },
  statValue: { ...MONO_STYLE, fontSize: 16, fontWeight: '700', color: COLORS.text, marginTop: 4 },
  statHint: { fontSize: 10.5, color: COLORS.subtext, marginTop: 2 },

  shareBtn: {
    position: 'absolute', top: 14, right: 14,
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
    zIndex: 2,
  },
  offscreen: {
    position: 'absolute',
    left: -10000, top: -10000,
  },
});
