import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Animated,
  KeyboardAvoidingView, Platform, TouchableOpacity, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import InputField from '../../components/InputField';
import PrimaryButton from '../../components/PrimaryButton';
import ResultCard from '../../components/ResultCard';
import DonutChart from '../../components/DonutChart';
import StorageService from '../../services/StorageService';
import { useApp } from '../../context/AppContext';
import { calculateGoalSIP } from '../../utils/calculations';
import { formatINR } from '../../utils/formatters';

const CALC_ID = 'goal';
const ACCENT  = '#1565C0';

const DEFAULTS = { goalName: '', goalAmount: '', years: '', rate: '12' };

export default function GoalPlannerCalculator({ navigation }) {
  const { addGoal } = useApp();
  const [inputs, setInputs]   = useState(DEFAULTS);
  const [errors, setErrors]   = useState({});
  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving]   = useState(false);
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    StorageService.getCalculatorInputs(CALC_ID).then((s) => { if (s) setInputs(s); });
  }, []);

  const set = (key) => (val) => setInputs((p) => ({ ...p, [key]: val }));

  const validate = () => {
    const e = {};
    const ga = parseFloat(inputs.goalAmount);
    const yr = parseFloat(inputs.years);
    const r  = parseFloat(inputs.rate);
    if (!inputs.goalName.trim())          e.goalName   = 'Enter a goal name';
    if (!ga || ga <= 0 || ga > 100_000_000) e.goalAmount = 'Enter ₹1 – ₹10 Crore';
    if (!yr || yr < 1 || yr > 40)          e.years      = 'Duration must be 1 – 40 years';
    if (!r  || r  < 0.1 || r > 30)         e.rate       = 'Rate must be 0.1% – 30%';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const calculate = async () => {
    if (!validate()) return;
    setLoading(true);
    fadeAnim.setValue(0); slideAnim.setValue(30);
    await new Promise((r) => setTimeout(r, 600));

    const res = calculateGoalSIP(
      parseFloat(inputs.goalAmount),
      parseFloat(inputs.years),
      parseFloat(inputs.rate),
    );
    setResult(res);
    setLoading(false);
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 9, useNativeDriver: true }),
    ]).start();
    StorageService.saveCalculatorInputs(CALC_ID, inputs);
  };

  const saveGoal = async () => {
    if (!result) return;
    setSaving(true);
    await addGoal({
      name:         inputs.goalName,
      targetAmount: parseFloat(inputs.goalAmount),
      years:        parseFloat(inputs.years),
      rate:         parseFloat(inputs.rate),
      monthlySIP:   result.monthlySIP,
    });
    setSaving(false);
    Alert.alert(
      '🎯 Goal Saved!',
      `"${inputs.goalName}" has been added to your Goals tab.`,
      [{ text: 'View Goals', onPress: () => navigation.navigate('Goals') }, { text: 'OK' }],
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Goal Planner</Text>
        <View style={[styles.badge, { backgroundColor: ACCENT + '20' }]}>
          <Ionicons name="flag" size={16} color={ACCENT} />
        </View>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Goal Details</Text>
            <InputField
              label="Goal Name"
              value={inputs.goalName}
              onChangeText={set('goalName')}
              placeholder="e.g. Dream Car, Child Education"
              keyboardType="default"
              error={errors.goalName}
            />
            <InputField
              label="Target Amount"
              value={inputs.goalAmount}
              onChangeText={set('goalAmount')}
              prefix="₹"
              placeholder="e.g. 2000000"
              error={errors.goalAmount}
            />
            <InputField
              label="Time to Achieve Goal"
              value={inputs.years}
              onChangeText={set('years')}
              suffix="years"
              placeholder="e.g. 5"
              error={errors.years}
            />
            <InputField
              label="Expected Return Rate"
              value={inputs.rate}
              onChangeText={set('rate')}
              suffix="% p.a."
              placeholder="12"
              error={errors.rate}
            />
          </View>

          <PrimaryButton
            title="Calculate Monthly SIP"
            onPress={calculate}
            loading={loading}
            gradient={[ACCENT, '#0D47A1']}
          />

          {result && (
            <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
              {/* Monthly SIP highlight */}
              <View style={styles.sipHighlight}>
                <Text style={styles.sipHlLabel}>Monthly SIP Required</Text>
                <Text style={[styles.sipHlValue, { color: ACCENT }]}>
                  {formatINR(result.monthlySIP)}
                </Text>
                <Text style={styles.sipHlSub}>
                  to accumulate {formatINR(parseFloat(inputs.goalAmount))} in {inputs.years} years
                </Text>
              </View>

              <DonutChart
                data={[
                  { label: 'You Invest', value: result.totalInvested, color: COLORS.primary },
                  { label: 'Returns',    value: result.returns,       color: ACCENT },
                ]}
                centerValue={parseFloat(inputs.goalAmount)}
                centerLabel="Goal Amount"
              />

              <ResultCard
                accentColor={ACCENT}
                data={[
                  { label: 'Monthly SIP',   value: result.monthlySIP,    color: ACCENT },
                  { label: 'Total Invested',value: result.totalInvested, color: COLORS.text },
                  { label: 'Returns',       value: result.returns,       color: COLORS.secondary },
                ]}
              />

              <PrimaryButton
                title={saving ? 'Saving…' : '🎯 Save This Goal'}
                onPress={saveGoal}
                loading={saving}
                gradient={[COLORS.secondary, '#00897B']}
                style={{ marginTop: 10 }}
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
  card: {
    backgroundColor: COLORS.card, borderRadius: 16, padding: 16, marginBottom: 14, ...COLORS.shadow,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 14 },
  sipHighlight: {
    backgroundColor: ACCENT + '12', borderRadius: 16, padding: 20,
    alignItems: 'center', marginBottom: 6,
  },
  sipHlLabel: { fontSize: 13, color: ACCENT, fontWeight: '600', marginBottom: 6 },
  sipHlValue: { fontSize: 34, fontWeight: '800' },
  sipHlSub:  { fontSize: 12, color: COLORS.subtext, marginTop: 4, textAlign: 'center' },
});
