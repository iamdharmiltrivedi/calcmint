import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
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
import { formatINR, formatMonths } from '../../utils/formatters';

const CALC_ID = 'home_loan';
const ACCENT = '#1A73E8';
const GREEN = '#16A34A';

const DEFAULTS = {
  propertyValue: '',
  downPayment: '20',
  interestRate: '8.5',
  tenureYears: '20',
};

// Amortization column widths: Year | Opening | Interest | Principal | Prepayment | Closing
const COL = [44, 88, 82, 82, 88, 88];

// ── Calculation Engine ──────────────────────────────────────────────────────

function emiFormula(principal, r, n) {
  if (r === 0) return principal / n;
  const p = Math.pow(1 + r, n);
  return (principal * r * p) / (p - 1);
}

function calculateWithPrepayments({ loanAmount, annualRate, tenureMonths, prepayments, prepaymentType }) {
  if (!loanAmount || loanAmount <= 0 || tenureMonths < 1) return null;

  const r = annualRate / 12 / 100;
  const baseEMI = emiFormula(loanAmount, r, tenureMonths);

  let outstanding = loanAmount;
  let currentEMI = baseEMI;
  let totalInterestPaid = 0;
  let totalPrepaymentMade = 0;
  let lastMonth = 0;

  const yearAgg = {};

  for (let month = 1; month <= tenureMonths; month++) {
    // Loan already closed in a previous iteration
    if (outstanding < 0.01) {
      lastMonth = month - 1;
      break;
    }

    const yearNum = Math.ceil(month / 12);

    if (!yearAgg[yearNum]) {
      yearAgg[yearNum] = {
        year: yearNum,
        openingBalance: outstanding,
        interestPaid: 0,
        principalPaid: 0,
        prepayment: 0,
        closingBalance: 0,
        hasPrepayment: false,
      };
    }

    // Reducing balance: monthly interest on outstanding principal
    const interest = outstanding * r;
    let principal = currentEMI - interest;

    // Final payment guard: don't overpay
    if (principal >= outstanding) {
      principal = outstanding;
      outstanding = 0;
    } else {
      outstanding -= principal;
    }

    totalInterestPaid += interest;
    yearAgg[yearNum].interestPaid += interest;
    yearAgg[yearNum].principalPaid += principal;

    // Apply any prepayments scheduled for this month
    let ppThisMonth = 0;
    for (const pp of prepayments) {
      if (outstanding < 0.01) break;
      const ppStart = (pp.year - 1) * 12 + pp.month;
      const applies = pp.recurringYearly
        ? month >= ppStart && (month - ppStart) % 12 === 0
        : month === ppStart;

      if (applies) {
        const actual = Math.min(pp.amount, outstanding);
        ppThisMonth += actual;
        outstanding = Math.max(0, outstanding - actual);
        totalPrepaymentMade += actual;
      }
    }

    if (ppThisMonth > 0) {
      yearAgg[yearNum].prepayment += ppThisMonth;
      yearAgg[yearNum].hasPrepayment = true;

      // Reduce EMI: recalculate for remaining original tenure months
      if (prepaymentType === 'reduce_emi' && outstanding > 0.01) {
        const remaining = tenureMonths - month;
        if (remaining > 0) currentEMI = emiFormula(outstanding, r, remaining);
      }
      // Reduce Tenure: EMI stays at baseEMI — loan closes earlier naturally
    }

    yearAgg[yearNum].closingBalance = outstanding;
    lastMonth = month;

    if (outstanding < 0.01) break;
  }

  // Build sorted yearly schedule with correct opening balances
  const schedule = [];
  let runningBalance = loanAmount;

  for (const yr of Object.keys(yearAgg).map(Number).sort((a, b) => a - b)) {
    const row = yearAgg[yr];
    row.openingBalance = runningBalance;
    runningBalance = row.closingBalance;
    schedule.push(row);
  }

  // Total cash outflow = principal + interest paid (prepayments reduce interest, not add extra cost)
  const totalPayment = loanAmount + totalInterestPaid;
  const baseTotalInterest = baseEMI * tenureMonths - loanAmount;
  const interestSaved = Math.max(0, baseTotalInterest - totalInterestPaid);
  const reducedMonths = tenureMonths - lastMonth;

  return {
    emi: baseEMI,
    currentEMI,
    totalInterest: totalInterestPaid,
    totalPayment,
    totalPrepayment: totalPrepaymentMade,
    interestSaved,
    actualMonths: lastMonth,
    reducedMonths,
    amortizationSchedule: schedule,
  };
}

// ── Component ───────────────────────────────────────────────────────────────

export default function HomeLoanCalculator({ navigation }) {
  const [inputs, setInputs] = useState(DEFAULTS);
  const [errors, setErrors] = useState({});
  const [isShown, setIsShown] = useState(false);
  const [prepaymentType, setPrepaymentType] = useState('reduce_tenure');
  const [prepayments, setPrepayments] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPP, setNewPP] = useState({ year: '1', month: '1', amount: '', recurringYearly: true });
  const [ppErrors, setPPErrors] = useState({});
  const [showAmortization, setShowAmortization] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    StorageService.getCalculatorInputs(CALC_ID).then(saved => {
      if (saved) setInputs(saved);
    });
  }, []);

  const set = useCallback((key) => (val) => setInputs(p => ({ ...p, [key]: val })), []);
  const setNewPPField = useCallback((key) => (val) => setNewPP(p => ({ ...p, [key]: val })), []);

  // Derived loan details — updates reactively as user types
  const loanDetails = useMemo(() => {
    const pv = parseFloat(inputs.propertyValue);
    const dpPct = parseFloat(inputs.downPayment);
    if (!pv || pv <= 0 || isNaN(dpPct) || dpPct < 0 || dpPct >= 100) return null;
    const dp = dpPct / 100;
    return { pv, loanAmount: pv * (1 - dp), downAmt: pv * dp };
  }, [inputs.propertyValue, inputs.downPayment]);

  // Full amortization — useMemo ensures instant recalculation on any input change
  const result = useMemo(() => {
    if (!loanDetails) return null;
    const ir = parseFloat(inputs.interestRate);
    const ty = parseFloat(inputs.tenureYears);
    if (!ir || ir <= 0 || ir > 30 || !ty || ty < 1 || ty > 30) return null;
    return calculateWithPrepayments({
      loanAmount: loanDetails.loanAmount,
      annualRate: ir,
      tenureMonths: Math.round(ty * 12),
      prepayments,
      prepaymentType,
    });
  }, [loanDetails, inputs.interestRate, inputs.tenureYears, prepayments, prepaymentType]);

  const validate = () => {
    const e = {};
    const pv = parseFloat(inputs.propertyValue);
    const dp = parseFloat(inputs.downPayment);
    const ir = parseFloat(inputs.interestRate);
    const ty = parseFloat(inputs.tenureYears);
    if (!pv || pv <= 0 || pv > 100_000_000) e.propertyValue = 'Enter a value between ₹1 and ₹10 Crore';
    if (isNaN(dp) || dp < 0 || dp >= 100) e.downPayment = 'Down payment must be 0–99%';
    if (!ir || ir < 0.1 || ir > 30) e.interestRate = 'Rate must be between 0.1% and 30%';
    if (!ty || ty < 1 || ty > 30) e.tenureYears = 'Tenure must be 1–30 years';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleCalculate = () => {
    if (!validate()) return;
    StorageService.saveCalculatorInputs(CALC_ID, inputs);
    if (!isShown) {
      fadeAnim.setValue(0);
      slideAnim.setValue(30);
      setIsShown(true);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 9, useNativeDriver: true }),
      ]).start();
    }
  };

  const addPrepayment = () => {
    const e = {};
    const yr = parseInt(newPP.year, 10);
    const mo = parseInt(newPP.month, 10);
    const amt = parseFloat(newPP.amount);
    if (!yr || yr < 1 || yr > 30) e.ppYear = 'Year must be 1–30';
    if (!mo || mo < 1 || mo > 12) e.ppMonth = 'Month must be 1–12';
    if (!amt || amt <= 0) e.ppAmount = 'Enter a valid amount';
    setPPErrors(e);
    if (Object.keys(e).length > 0) return;

    setPrepayments(prev => [
      ...prev,
      { id: Date.now().toString(), year: yr, month: mo, amount: amt, recurringYearly: newPP.recurringYearly },
    ]);
    setNewPP({ year: '1', month: '1', amount: '', recurringYearly: true });
    setShowAddForm(false);
    setPPErrors({});
  };

  const removePrepayment = useCallback(
    (id) => setPrepayments(prev => prev.filter(pp => pp.id !== id)),
    [],
  );

  const hasPrepayments = prepayments.length > 0;
  const hasTimeSaved = result && result.reducedMonths > 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Home Loan Calculator</Text>
        <View style={[styles.badge, { backgroundColor: ACCENT + '20' }]}>
          <Ionicons name="home" size={16} color={ACCENT} />
        </View>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Loan Details ── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Loan Details</Text>
            <InputField
              label="Property Value"
              value={inputs.propertyValue}
              onChangeText={set('propertyValue')}
              prefix="₹"
              placeholder="e.g. 7500000"
              error={errors.propertyValue}
            />
            <InputField
              label="Down Payment"
              value={inputs.downPayment}
              onChangeText={set('downPayment')}
              suffix="%"
              placeholder="20"
              error={errors.downPayment}
            />
            <InputField
              label="Annual Interest Rate"
              value={inputs.interestRate}
              onChangeText={set('interestRate')}
              suffix="% p.a."
              placeholder="8.5"
              error={errors.interestRate}
            />
            <InputField
              label="Loan Tenure"
              value={inputs.tenureYears}
              onChangeText={set('tenureYears')}
              suffix="years"
              placeholder="20"
              error={errors.tenureYears}
            />
            {loanDetails && (
              <View style={styles.preview}>
                <Text style={styles.previewLabel}>Loan Amount</Text>
                <Text style={[styles.previewValue, { color: ACCENT }]}>
                  {formatINR(loanDetails.loanAmount)}
                </Text>
              </View>
            )}
          </View>

          {/* ── Pre-payment Type ── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Pre-payment Type</Text>
            <RadioOption
              label="Reduce Tenure  (keep EMI same)"
              selected={prepaymentType === 'reduce_tenure'}
              onPress={() => setPrepaymentType('reduce_tenure')}
            />
            <RadioOption
              label="Reduce EMI  (keep tenure same)"
              selected={prepaymentType === 'reduce_emi'}
              onPress={() => setPrepaymentType('reduce_emi')}
            />
          </View>

          {/* ── Pre-payments ── */}
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <Text style={[styles.cardTitle, { marginBottom: 0 }]}>Pre-payments</Text>
              {!showAddForm && (
                <TouchableOpacity onPress={() => setShowAddForm(true)} style={styles.addBtn}>
                  <Ionicons name="add-circle-outline" size={18} color={ACCENT} />
                  <Text style={[styles.addBtnText, { color: ACCENT }]}>Add</Text>
                </TouchableOpacity>
              )}
            </View>

            {prepayments.length === 0 && !showAddForm && (
              <Text style={styles.emptyHint}>
                No pre-payments added. Tap Add to schedule one.
              </Text>
            )}

            {prepayments.map(pp => (
              <PrepaymentItem key={pp.id} pp={pp} onRemove={removePrepayment} />
            ))}

            {showAddForm && (
              <View style={styles.addForm}>
                <View style={styles.ppFieldRow}>
                  <View style={styles.ppFieldHalf}>
                    <InputField
                      label="Year"
                      value={newPP.year}
                      onChangeText={setNewPPField('year')}
                      placeholder="1"
                      error={ppErrors.ppYear}
                    />
                  </View>
                  <View style={styles.ppFieldHalfRight}>
                    <InputField
                      label="Month (1–12)"
                      value={newPP.month}
                      onChangeText={setNewPPField('month')}
                      placeholder="1"
                      error={ppErrors.ppMonth}
                    />
                  </View>
                </View>

                <InputField
                  label="Pre-payment Amount"
                  value={newPP.amount}
                  onChangeText={setNewPPField('amount')}
                  prefix="₹"
                  placeholder="100000"
                  error={ppErrors.ppAmount}
                />

                <TouchableOpacity
                  style={styles.checkRow}
                  onPress={() => setNewPP(p => ({ ...p, recurringYearly: !p.recurringYearly }))}
                  activeOpacity={0.7}
                >
                  <View style={[styles.checkbox, newPP.recurringYearly && styles.checkboxChecked]}>
                    {newPP.recurringYearly && <Ionicons name="checkmark" size={12} color="#fff" />}
                  </View>
                  <Text style={styles.checkLabel}>
                    Apply same amount every year until loan ends
                  </Text>
                </TouchableOpacity>

                <View style={styles.formBtns}>
                  <TouchableOpacity
                    style={[styles.formBtn, { backgroundColor: ACCENT }]}
                    onPress={addPrepayment}
                  >
                    <Text style={styles.formBtnText}>Add</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.formBtn, styles.formBtnCancel]}
                    onPress={() => { setShowAddForm(false); setPPErrors({}); }}
                  >
                    <Text style={[styles.formBtnText, { color: COLORS.subtext }]}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          <PrimaryButton
            title="Calculate EMI"
            onPress={handleCalculate}
            gradient={[ACCENT, '#0D47A1']}
          />

          {/* ── Results (shown after button press; updates reactively) ── */}
          {isShown && result && (
            <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

              <DonutChart
                data={[
                  { label: 'Principal', value: loanDetails.loanAmount, color: ACCENT },
                  { label: 'Interest', value: result.totalInterest, color: '#FF6D00' },
                ]}
                centerValue={result.totalPayment}
                centerLabel="Total Payment"
              />

              <ResultCard
                accentColor={ACCENT}
                data={[
                  { label: 'Monthly EMI', value: result.emi, color: ACCENT },
                  { label: 'Total Interest', value: result.totalInterest, color: '#FF6D00' },
                  { label: 'Total Payment', value: result.totalPayment },
                ]}
              />

              <View style={styles.infoGrid}>
                <InfoTile label="Loan Amount" value={formatINR(loanDetails.loanAmount)} />
                <InfoTile label="Down Payment" value={formatINR(loanDetails.downAmt)} />
                <InfoTile label="Property Value" value={formatINR(loanDetails.pv)} />
                <InfoTile
                  label="LTV Ratio"
                  value={`${Math.round((loanDetails.loanAmount / loanDetails.pv) * 100)}%`}
                />
              </View>

              {/* ── With Pre-payment Results ── */}
              {hasPrepayments && (
                <View style={[styles.card, styles.ppResultCard]}>
                  <View style={styles.ppResultHeader}>
                    <Ionicons name="trending-down" size={18} color={GREEN} />
                    <Text style={styles.ppResultTitle}>With Pre-payment Results</Text>
                  </View>
                  <View style={styles.ppResultGrid}>
                    <PPResultTile
                      label="Actual Loan Term"
                      value={formatMonths(result.actualMonths)}
                      color={ACCENT}
                    />
                    {hasTimeSaved && (
                      <PPResultTile
                        label="Time Saved"
                        value={formatMonths(result.reducedMonths)}
                        color={GREEN}
                      />
                    )}
                    <PPResultTile
                      label="Interest Saved"
                      value={formatINR(result.interestSaved)}
                      color={GREEN}
                    />
                    <PPResultTile
                      label="Total Pre-payments"
                      value={formatINR(result.totalPrepayment)}
                      color={COLORS.text}
                    />
                    <PPResultTile
                      label="New Total Payment"
                      value={formatINR(result.totalPayment)}
                      color={COLORS.text}
                    />
                    {prepaymentType === 'reduce_emi' && result.currentEMI < result.emi - 1 && (
                      <PPResultTile
                        label="Revised EMI"
                        value={formatINR(result.currentEMI)}
                        color={ACCENT}
                      />
                    )}
                  </View>
                </View>
              )}

              {/* ── Amortization Toggle ── */}
              <TouchableOpacity
                style={styles.amortToggle}
                onPress={() => setShowAmortization(v => !v)}
                activeOpacity={0.7}
              >
                <Text style={styles.amortToggleText}>
                  {showAmortization ? 'Hide' : 'Show'} Amortization Schedule
                </Text>
                <Ionicons
                  name={showAmortization ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={ACCENT}
                />
              </TouchableOpacity>

              {/* ── Amortization Table ── */}
              {showAmortization && (
                <View style={styles.amortCard}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View>
                      <View style={styles.amortHeaderRow}>
                        {['Yr', 'Opening', 'Interest', 'Principal', 'Prepayment', 'Closing'].map((h, i) => (
                          <Text
                            key={h}
                            style={[
                              styles.amortHeaderCell,
                              { width: COL[i], textAlign: i === 0 ? 'center' : 'right' },
                            ]}
                          >
                            {h}
                          </Text>
                        ))}
                      </View>

                      {result.amortizationSchedule.map((row, idx) => (
                        <View
                          key={row.year}
                          style={[
                            styles.amortRow,
                            idx % 2 === 1 && styles.amortRowAlt,
                            row.hasPrepayment && styles.amortRowPP,
                          ]}
                        >
                          <Text style={[styles.amortCell, styles.amortYearCell, { width: COL[0] }]}>
                            {row.year}
                          </Text>
                          <Text style={[styles.amortCell, { width: COL[1] }]}>
                            {formatINR(row.openingBalance)}
                          </Text>
                          <Text style={[styles.amortCell, { width: COL[2], color: '#FF6D00' }]}>
                            {formatINR(row.interestPaid)}
                          </Text>
                          <Text style={[styles.amortCell, { width: COL[3], color: ACCENT }]}>
                            {formatINR(row.principalPaid)}
                          </Text>
                          <Text style={[styles.amortCell, { width: COL[4], color: GREEN }]}>
                            {row.prepayment > 0 ? formatINR(row.prepayment) : '—'}
                          </Text>
                          <Text style={[styles.amortCell, { width: COL[5] }]}>
                            {formatINR(row.closingBalance)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </ScrollView>

                  {hasPrepayments && (
                    <View style={styles.amortLegend}>
                      <View style={styles.legendDot} />
                      <Text style={styles.legendText}>Green rows contain pre-payments</Text>
                    </View>
                  )}
                </View>
              )}
            </Animated.View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

const RadioOption = ({ label, selected, onPress }) => (
  <TouchableOpacity style={styles.radioRow} onPress={onPress} activeOpacity={0.7}>
    <View style={[styles.radioCircle, selected && styles.radioSelected]}>
      {selected && <View style={styles.radioDot} />}
    </View>
    <Text style={[styles.radioLabel, selected && styles.radioLabelOn]}>{label}</Text>
  </TouchableOpacity>
);

const PrepaymentItem = ({ pp, onRemove }) => (
  <View style={styles.ppItem}>
    <View style={{ flex: 1 }}>
      <Text style={styles.ppItemTitle}>
        Year {pp.year}, Month {pp.month} — {formatINR(pp.amount)}
      </Text>
      {pp.recurringYearly && (
        <View style={styles.ppBadge}>
          <Text style={styles.ppBadgeText}>Recurring Yearly</Text>
        </View>
      )}
    </View>
    <TouchableOpacity
      onPress={() => onRemove(pp.id)}
      style={styles.ppRemove}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Ionicons name="close-circle" size={20} color={COLORS.error} />
    </TouchableOpacity>
  </View>
);

const InfoTile = ({ label, value }) => (
  <View style={styles.tile}>
    <Text style={styles.tileLabel}>{label}</Text>
    <Text style={styles.tileValue}>{value}</Text>
  </View>
);

const PPResultTile = ({ label, value, color }) => (
  <View style={styles.ppTile}>
    <Text style={styles.ppTileLabel}>{label}</Text>
    <Text style={[styles.ppTileValue, color && { color }]}>{value}</Text>
  </View>
);

// ── Styles ──────────────────────────────────────────────────────────────────

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
    backgroundColor: COLORS.card, borderRadius: 16, padding: 16,
    marginBottom: 14, ...COLORS.shadow,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 14 },
  cardTitleRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14,
  },

  preview: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: COLORS.background, borderRadius: 10, padding: 12, marginTop: 4,
  },
  previewLabel: { fontSize: 13, color: COLORS.subtext, fontWeight: '500' },
  previewValue: { fontSize: 16, fontWeight: '800' },

  // Radio buttons
  radioRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  radioCircle: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 2,
    borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center', marginRight: 10,
  },
  radioSelected: { borderColor: ACCENT },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: ACCENT },
  radioLabel: { fontSize: 14, color: COLORS.subtext, flex: 1 },
  radioLabelOn: { color: COLORS.text, fontWeight: '600' },

  // Prepayments list
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addBtnText: { fontSize: 14, fontWeight: '600' },
  emptyHint: { fontSize: 13, color: COLORS.subtext, textAlign: 'center', paddingVertical: 12 },

  ppItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  ppItemTitle: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  ppBadge: {
    alignSelf: 'flex-start', marginTop: 4,
    backgroundColor: ACCENT + '18', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2,
  },
  ppBadgeText: { fontSize: 11, color: ACCENT, fontWeight: '600' },
  ppRemove: { padding: 4 },

  // Add prepayment form
  addForm: { marginTop: 4 },
  ppFieldRow: { flexDirection: 'row', gap: 10 },
  ppFieldHalf: { flex: 1 },
  ppFieldHalfRight: { flex: 1 },
  checkRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 10, gap: 10 },
  checkbox: {
    width: 20, height: 20, borderRadius: 4, borderWidth: 2,
    borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center',
  },
  checkboxChecked: { backgroundColor: ACCENT, borderColor: ACCENT },
  checkLabel: { fontSize: 13, color: COLORS.text, flex: 1, lineHeight: 18 },
  formBtns: { flexDirection: 'row', gap: 10, marginTop: 4 },
  formBtn: { flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  formBtnCancel: { backgroundColor: COLORS.background },
  formBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  // Info tiles
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, gap: 8 },
  tile: {
    flex: 1, minWidth: '45%', backgroundColor: COLORS.card, borderRadius: 12,
    padding: 12, alignItems: 'center', ...COLORS.shadow,
  },
  tileLabel: { fontSize: 11, color: COLORS.subtext, fontWeight: '500', marginBottom: 4 },
  tileValue: { fontSize: 15, fontWeight: '700', color: COLORS.text },

  // Pre-payment results
  ppResultCard: { borderLeftWidth: 3, borderLeftColor: GREEN },
  ppResultHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  ppResultTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  ppResultGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  ppTile: {
    width: '47%', backgroundColor: COLORS.background, borderRadius: 10, padding: 10,
  },
  ppTileLabel: {
    fontSize: 10, color: COLORS.subtext, fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 4,
  },
  ppTileValue: { fontSize: 15, fontWeight: '800', color: COLORS.text },

  // Amortization toggle button
  amortToggle: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, marginTop: 14, paddingVertical: 12,
    backgroundColor: COLORS.card, borderRadius: 12, ...COLORS.shadow,
  },
  amortToggleText: { fontSize: 14, fontWeight: '600', color: ACCENT },

  // Amortization table
  amortCard: {
    backgroundColor: COLORS.card, borderRadius: 16, padding: 12,
    marginTop: 14, ...COLORS.shadow,
  },
  amortHeaderRow: {
    flexDirection: 'row', borderBottomWidth: 1.5, borderBottomColor: COLORS.border,
    paddingBottom: 8, marginBottom: 2,
  },
  amortHeaderCell: {
    fontSize: 10, fontWeight: '700', color: COLORS.subtext,
    textTransform: 'uppercase', letterSpacing: 0.3, paddingHorizontal: 4,
  },
  amortRow: { flexDirection: 'row', paddingVertical: 6 },
  amortRowAlt: { backgroundColor: COLORS.background + 'AA' },
  amortRowPP: { backgroundColor: '#E8F5E9' },
  amortCell: {
    fontSize: 12, color: COLORS.text, textAlign: 'right',
    fontWeight: '500', paddingHorizontal: 4,
  },
  amortYearCell: { fontWeight: '700', textAlign: 'center' },
  amortLegend: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  legendDot: { width: 12, height: 12, borderRadius: 2, backgroundColor: '#C8E6C9' },
  legendText: { fontSize: 11, color: COLORS.subtext },
});
