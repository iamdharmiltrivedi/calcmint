import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Animated,
  KeyboardAvoidingView, Platform, TouchableOpacity, LayoutAnimation, UIManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import InputField from '../../components/InputField';
import PrimaryButton from '../../components/PrimaryButton';
import StorageService from '../../services/StorageService';
import { calculateITR, compareRegimes } from '../../utils/calculations';
import { formatINRFull, formatPercent } from '../../utils/formatters';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const CALC_ID = 'itr';
const ACCENT = '#C2185B';

const FINANCIAL_YEARS = ['FY 2025-26', 'FY 2026-27'];
const AY_FOR_FY = { 'FY 2025-26': 'AY 2026-27', 'FY 2026-27': 'AY 2027-28' };

const RESIDENTIAL = ['Resident', 'NRI', 'RNOR'];
const TAXPAYER_TYPES = ['Salaried', 'Business', 'Freelancer', 'Proprietor', 'Other'];

const DEFAULTS = {
  // Basic
  financialYear: 'FY 2025-26',
  age: '30',
  residentialStatus: 'Resident',
  taxpayerType: 'Salaried',
  regime: 'new',

  // Salary
  basic: '', hraReceived: '', lta: '', bonus: '', specialAllowance: '',
  otherAllowances: '', perquisites: '', gratuity: '', pension: '',
  professionalTax: '', employerPF: '',

  // HRA exemption
  rentPaid: '', metro: true, basicForHRA: '',

  // Business / freelance
  grossRevenue: '', grossReceipts: '', expenses: '',
  depreciation: '', partnerSalary: '', interestOnCapital: '',
  gstRegistered: false, section44AD: false, section44ADA: false,

  // Capital gains
  equitySTCG: '', equityLTCG: '', mfGains: '', propertyGain: '',
  cryptoIncome: '', foreignAssetGain: '',

  // Other income
  interestIncome: '', fdInterest: '', savingsInterest: '', dividend: '',
  rentalIncome: '', familyPension: '', agricultural: '', lottery: '',
  giftsReceived: '',

  // Deductions — 80C
  epf: '', ppf: '', elss: '', lifeInsurance: '', homeLoanPrincipal: '',
  sukanya: '', taxSaverFD: '', nps80CCD1: '',
  // 80CCD(1B)
  nps80CCD1B: '',
  // 80D
  medicalSelf: '', medicalParents: '', healthCheckup: '', parentsSenior: false,
  // Other
  educationLoanInterest: '', homeLoanInterest80EEA: '', donations: '',
  seniorInterest: '',
  disabilitySelf: 'none', disabilityDependent: 'none',

  // Home loan / house property
  homeLoanInterest: '', selfOccupied: true,

  // Taxes paid
  tds: '', advanceTax: '', selfAssessmentTax: '',
};

const Section = ({ title, icon, open, onToggle, children, accent = ACCENT }) => (
  <View style={styles.section}>
    <TouchableOpacity style={styles.sectionHeader} onPress={onToggle} activeOpacity={0.7}>
      <View style={styles.sectionLeft}>
        <View style={[styles.sectionIcon, { backgroundColor: accent + '18' }]}>
          <Ionicons name={icon} size={16} color={accent} />
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={COLORS.subtext} />
    </TouchableOpacity>
    {open && <View style={styles.sectionBody}>{children}</View>}
  </View>
);

const Chips = ({ options, value, onChange }) => (
  <View style={styles.chipsRow}>
    {options.map((opt) => {
      const v = typeof opt === 'string' ? opt : opt.value;
      const label = typeof opt === 'string' ? opt : opt.label;
      const active = value === v;
      return (
        <TouchableOpacity
          key={String(v)}
          onPress={() => onChange(v)}
          style={[styles.chip, active && { backgroundColor: ACCENT, borderColor: ACCENT }]}
        >
          <Text style={[styles.chipText, active && { color: '#fff' }]}>{label}</Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

const ToggleRow = ({ label, value, onChange, hint }) => (
  <TouchableOpacity style={styles.toggleRow} onPress={() => onChange(!value)} activeOpacity={0.7}>
    <View style={{ flex: 1 }}>
      <Text style={styles.toggleLabel}>{label}</Text>
      {hint ? <Text style={styles.toggleHint}>{hint}</Text> : null}
    </View>
    <View style={[styles.toggleTrack, value && { backgroundColor: ACCENT }]}>
      <View style={[styles.toggleThumb, value && { transform: [{ translateX: 18 }] }]} />
    </View>
  </TouchableOpacity>
);

const SummaryRow = ({ label, value, bold, color, sub }) => (
  <View style={styles.sumRow}>
    <Text style={[styles.sumLabel, bold && { fontWeight: '700', color: COLORS.text }, sub && styles.sumLabelSub]}>
      {label}
    </Text>
    <Text style={[styles.sumValue, bold && { fontWeight: '800' }, color ? { color } : null]}>
      {typeof value === 'number' ? formatINRFull(value) : value}
    </Text>
  </View>
);

export default function TaxSavingsCalculator({ navigation }) {
  const [inputs, setInputs] = useState(DEFAULTS);
  const [open, setOpen] = useState({ basic: true });
  const [result, setResult] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    StorageService.getCalculatorInputs(CALC_ID).then((s) => {
      if (s) setInputs({ ...DEFAULTS, ...s });
    });
  }, []);

  const set = (key) => (val) => setInputs((p) => ({ ...p, [key]: val }));

  const toggle = (key) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((p) => ({ ...p, [key]: !p[key] }));
  };

  const buildPayload = () => ({
    age: parseFloat(inputs.age) || 30,
    regime: inputs.regime,
    salary: {
      basic: inputs.basic,
      hraReceived: inputs.hraReceived,
      lta: inputs.lta,
      bonus: inputs.bonus,
      specialAllowance: inputs.specialAllowance,
      otherAllowances: inputs.otherAllowances,
      perquisites: inputs.perquisites,
      gratuity: inputs.gratuity,
      pension: inputs.pension,
      professionalTax: inputs.professionalTax,
    },
    hra: {
      rentPaid: inputs.rentPaid,
      metro: inputs.metro,
      basicForHRA: inputs.basicForHRA || inputs.basic,
      hraReceived: inputs.hraReceived,
    },
    business: {
      grossRevenue: inputs.grossRevenue,
      grossReceipts: inputs.grossReceipts,
      expenses: inputs.expenses,
      depreciation: inputs.depreciation,
      section44AD: inputs.section44AD,
      section44ADA: inputs.section44ADA,
    },
    capitalGains: {
      equitySTCG: inputs.equitySTCG,
      equityLTCG: inputs.equityLTCG,
      mfGains: inputs.mfGains,
      propertyGain: inputs.propertyGain,
      cryptoIncome: inputs.cryptoIncome,
      foreignAssetGain: inputs.foreignAssetGain,
    },
    otherIncome: {
      interestIncome: inputs.interestIncome,
      fdInterest: inputs.fdInterest,
      savingsInterest: inputs.savingsInterest,
      dividend: inputs.dividend,
      rentalIncome: inputs.rentalIncome,
      familyPension: inputs.familyPension,
      lottery: inputs.lottery,
      giftsReceived: inputs.giftsReceived,
    },
    deductions: {
      epf: inputs.epf, ppf: inputs.ppf, elss: inputs.elss,
      lifeInsurance: inputs.lifeInsurance, homeLoanPrincipal: inputs.homeLoanPrincipal,
      sukanya: inputs.sukanya, taxSaverFD: inputs.taxSaverFD, nps80CCD1: inputs.nps80CCD1,
      nps80CCD1B: inputs.nps80CCD1B,
      medicalSelf: inputs.medicalSelf, medicalParents: inputs.medicalParents,
      healthCheckup: inputs.healthCheckup, parentsSenior: inputs.parentsSenior,
      savingsInterest: inputs.savingsInterest,
      seniorInterest: inputs.seniorInterest,
      educationLoanInterest: inputs.educationLoanInterest,
      homeLoanInterest80EEA: inputs.homeLoanInterest80EEA,
      donations: inputs.donations,
      disabilitySelf: inputs.disabilitySelf,
      disabilityDependent: inputs.disabilityDependent,
      homeLoanInterest: inputs.homeLoanInterest,
      selfOccupied: inputs.selfOccupied,
    },
    taxesPaid: {
      tds: inputs.tds, advanceTax: inputs.advanceTax, selfAssessmentTax: inputs.selfAssessmentTax,
    },
  });

  const calculate = async () => {
    setLoading(true);
    fadeAnim.setValue(0);
    await new Promise((r) => setTimeout(r, 350));
    const payload = buildPayload();
    setResult(calculateITR(payload));
    setComparison(compareRegimes(payload));
    setLoading(false);
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    StorageService.saveCalculatorInputs(CALC_ID, inputs);
  };

  const assessmentYear = AY_FOR_FY[inputs.financialYear];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.headerTitle}>ITR Calculator</Text>
          <Text style={styles.headerSub}>{inputs.financialYear} · {assessmentYear}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: ACCENT + '20' }]}>
          <Ionicons name="receipt" size={16} color={ACCENT} />
        </View>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* Regime banner */}
          <View style={styles.regimeCard}>
            <Text style={styles.regimeLabel}>Tax Regime</Text>
            <View style={styles.regimeRow}>
              {['new', 'old'].map((r) => (
                <TouchableOpacity
                  key={r}
                  onPress={() => set('regime')(r)}
                  style={[styles.regimeBtn, inputs.regime === r && { backgroundColor: ACCENT, borderColor: ACCENT }]}
                >
                  <Text style={[styles.regimeBtnText, inputs.regime === r && { color: '#fff' }]}>
                    {r === 'new' ? 'New Regime' : 'Old Regime'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.regimeHint}>
              {inputs.regime === 'new'
                ? 'Standard deduction ₹75K · No 80C/HRA/24(b) · Rebate u/s 87A up to ₹12L'
                : 'Standard deduction ₹50K · 80C/HRA/24(b) allowed · Rebate u/s 87A up to ₹5L'}
            </Text>
          </View>

          {/* 1. Basic Details */}
          <Section title="Basic Details" icon="person" open={open.basic} onToggle={() => toggle('basic')}>
            <Text style={styles.fieldLabel}>Financial Year</Text>
            <Chips options={FINANCIAL_YEARS} value={inputs.financialYear} onChange={set('financialYear')} />
            <InputField label="Age" value={inputs.age} onChangeText={set('age')} placeholder="30" />
            <Text style={styles.fieldLabel}>Residential Status</Text>
            <Chips options={RESIDENTIAL} value={inputs.residentialStatus} onChange={set('residentialStatus')} />
            <Text style={styles.fieldLabel}>Taxpayer Type</Text>
            <Chips options={TAXPAYER_TYPES} value={inputs.taxpayerType} onChange={set('taxpayerType')} />
          </Section>

          {/* 2. Salary Income */}
          <Section title="Salary Income" icon="briefcase" open={open.salary} onToggle={() => toggle('salary')}>
            <InputField label="Annual Basic Salary" value={inputs.basic} onChangeText={set('basic')} prefix="₹" placeholder="e.g. 600000" />
            <InputField label="HRA Received" value={inputs.hraReceived} onChangeText={set('hraReceived')} prefix="₹" />
            <InputField label="LTA Received" value={inputs.lta} onChangeText={set('lta')} prefix="₹" />
            <InputField label="Bonus" value={inputs.bonus} onChangeText={set('bonus')} prefix="₹" />
            <InputField label="Special Allowance" value={inputs.specialAllowance} onChangeText={set('specialAllowance')} prefix="₹" />
            <InputField label="Other Allowances" value={inputs.otherAllowances} onChangeText={set('otherAllowances')} prefix="₹" />
            <InputField label="Perquisites" value={inputs.perquisites} onChangeText={set('perquisites')} prefix="₹" />
            <InputField label="Gratuity" value={inputs.gratuity} onChangeText={set('gratuity')} prefix="₹" />
            <InputField label="Pension Income" value={inputs.pension} onChangeText={set('pension')} prefix="₹" />
            <InputField label="Professional Tax (old regime only)" value={inputs.professionalTax} onChangeText={set('professionalTax')} prefix="₹" />
            <InputField label="Employer PF Contribution" value={inputs.employerPF} onChangeText={set('employerPF')} prefix="₹" />
          </Section>

          {/* 3. HRA */}
          <Section title="House Rent Allowance (HRA)" icon="home" open={open.hra} onToggle={() => toggle('hra')}>
            <InputField label="Rent Paid (annual)" value={inputs.rentPaid} onChangeText={set('rentPaid')} prefix="₹" />
            <InputField label="Basic Salary for HRA" value={inputs.basicForHRA} onChangeText={set('basicForHRA')} prefix="₹" placeholder="Defaults to basic salary" />
            <ToggleRow label="Metro City" value={inputs.metro} onChange={set('metro')} hint="50% basic if metro, else 40%" />
          </Section>

          {/* 4. Business / Freelance */}
          <Section title="Business / Freelance Income" icon="storefront" open={open.business} onToggle={() => toggle('business')}>
            <InputField label="Gross Business Revenue" value={inputs.grossRevenue} onChangeText={set('grossRevenue')} prefix="₹" />
            <InputField label="Gross Receipts (Profession)" value={inputs.grossReceipts} onChangeText={set('grossReceipts')} prefix="₹" />
            <InputField label="Business Expenses" value={inputs.expenses} onChangeText={set('expenses')} prefix="₹" />
            <InputField label="Depreciation" value={inputs.depreciation} onChangeText={set('depreciation')} prefix="₹" />
            <ToggleRow label="GST Registered" value={inputs.gstRegistered} onChange={set('gstRegistered')} />
            <ToggleRow
              label="Section 44ADA (Professionals)"
              value={inputs.section44ADA}
              onChange={(v) => { set('section44ADA')(v); if (v) set('section44AD')(false); }}
              hint="50% of gross receipts deemed as profit"
            />
            <ToggleRow
              label="Section 44AD (Small Business)"
              value={inputs.section44AD}
              onChange={(v) => { set('section44AD')(v); if (v) set('section44ADA')(false); }}
              hint="6% / 8% of turnover deemed as profit"
            />
          </Section>

          {/* 5. Capital Gains */}
          <Section title="Capital Gains" icon="trending-up" open={open.cg} onToggle={() => toggle('cg')}>
            <InputField label="Equity STCG (taxed @ 20%)" value={inputs.equitySTCG} onChangeText={set('equitySTCG')} prefix="₹" />
            <InputField label="Equity LTCG (>₹1.25L @ 12.5%)" value={inputs.equityLTCG} onChangeText={set('equityLTCG')} prefix="₹" />
            <InputField label="Mutual Fund Gains" value={inputs.mfGains} onChangeText={set('mfGains')} prefix="₹" />
            <InputField label="Property Gain (LTCG @ 12.5%)" value={inputs.propertyGain} onChangeText={set('propertyGain')} prefix="₹" />
            <InputField label="Crypto / VDA Income (@ 30%)" value={inputs.cryptoIncome} onChangeText={set('cryptoIncome')} prefix="₹" />
            <InputField label="Foreign Asset Gain" value={inputs.foreignAssetGain} onChangeText={set('foreignAssetGain')} prefix="₹" />
          </Section>

          {/* 6. Other Income */}
          <Section title="Other Income" icon="cash" open={open.other} onToggle={() => toggle('other')}>
            <InputField label="Interest Income (general)" value={inputs.interestIncome} onChangeText={set('interestIncome')} prefix="₹" />
            <InputField label="FD Interest" value={inputs.fdInterest} onChangeText={set('fdInterest')} prefix="₹" />
            <InputField label="Savings Account Interest" value={inputs.savingsInterest} onChangeText={set('savingsInterest')} prefix="₹" />
            <InputField label="Dividend Income" value={inputs.dividend} onChangeText={set('dividend')} prefix="₹" />
            <InputField label="Rental Income (annual)" value={inputs.rentalIncome} onChangeText={set('rentalIncome')} prefix="₹" />
            <InputField label="Family Pension" value={inputs.familyPension} onChangeText={set('familyPension')} prefix="₹" />
            <InputField label="Agricultural Income (exempt)" value={inputs.agricultural} onChangeText={set('agricultural')} prefix="₹" />
            <InputField label="Lottery / Winnings (@ 30%)" value={inputs.lottery} onChangeText={set('lottery')} prefix="₹" />
            <InputField label="Gifts Received (taxable)" value={inputs.giftsReceived} onChangeText={set('giftsReceived')} prefix="₹" />
          </Section>

          {/* 7. Deductions */}
          <Section title="Deductions (Old Regime)" icon="ribbon" open={open.ded} onToggle={() => toggle('ded')}>
            <Text style={styles.subHeader}>Section 80C (max ₹1.5L)</Text>
            <InputField label="EPF" value={inputs.epf} onChangeText={set('epf')} prefix="₹" />
            <InputField label="PPF" value={inputs.ppf} onChangeText={set('ppf')} prefix="₹" />
            <InputField label="ELSS" value={inputs.elss} onChangeText={set('elss')} prefix="₹" />
            <InputField label="Life Insurance Premium" value={inputs.lifeInsurance} onChangeText={set('lifeInsurance')} prefix="₹" />
            <InputField label="Home Loan Principal" value={inputs.homeLoanPrincipal} onChangeText={set('homeLoanPrincipal')} prefix="₹" />
            <InputField label="Sukanya Samriddhi" value={inputs.sukanya} onChangeText={set('sukanya')} prefix="₹" />
            <InputField label="Tax Saver FD" value={inputs.taxSaverFD} onChangeText={set('taxSaverFD')} prefix="₹" />
            <InputField label="NPS u/s 80CCD(1)" value={inputs.nps80CCD1} onChangeText={set('nps80CCD1')} prefix="₹" />

            <Text style={styles.subHeader}>Section 80CCD(1B) (extra NPS, max ₹50K)</Text>
            <InputField label="Additional NPS" value={inputs.nps80CCD1B} onChangeText={set('nps80CCD1B')} prefix="₹" />

            <Text style={styles.subHeader}>Section 80D (Health Insurance)</Text>
            <InputField label="Self / Family Premium" value={inputs.medicalSelf} onChangeText={set('medicalSelf')} prefix="₹" />
            <InputField label="Parents Premium" value={inputs.medicalParents} onChangeText={set('medicalParents')} prefix="₹" />
            <InputField label="Preventive Health Checkup (max ₹5K)" value={inputs.healthCheckup} onChangeText={set('healthCheckup')} prefix="₹" />
            <ToggleRow label="Parents are Senior Citizens (60+)" value={inputs.parentsSenior} onChange={set('parentsSenior')} />

            <Text style={styles.subHeader}>Other Deductions</Text>
            <InputField label="80E – Education Loan Interest" value={inputs.educationLoanInterest} onChangeText={set('educationLoanInterest')} prefix="₹" />
            <InputField label="80EEA – Home Loan Interest (₹1.5L)" value={inputs.homeLoanInterest80EEA} onChangeText={set('homeLoanInterest80EEA')} prefix="₹" />
            <InputField label="80G – Donations" value={inputs.donations} onChangeText={set('donations')} prefix="₹" />
            <InputField label="80TTB – Senior Citizen Interest" value={inputs.seniorInterest} onChangeText={set('seniorInterest')} prefix="₹" />

            <Text style={styles.fieldLabel}>80U – Self Disability</Text>
            <Chips
              options={[
                { value: 'none', label: 'None' },
                { value: 'normal', label: '40-79%' },
                { value: 'severe', label: '80%+' },
              ]}
              value={inputs.disabilitySelf}
              onChange={set('disabilitySelf')}
            />
            <Text style={styles.fieldLabel}>80DD – Dependent Disability</Text>
            <Chips
              options={[
                { value: 'none', label: 'None' },
                { value: 'normal', label: '40-79%' },
                { value: 'severe', label: '80%+' },
              ]}
              value={inputs.disabilityDependent}
              onChange={set('disabilityDependent')}
            />
          </Section>

          {/* 8. Home Loan / Section 24(b) */}
          <Section title="Home Loan / Section 24(b)" icon="home-outline" open={open.home} onToggle={() => toggle('home')}>
            <InputField label="Home Loan Interest Paid" value={inputs.homeLoanInterest} onChangeText={set('homeLoanInterest')} prefix="₹" />
            <ToggleRow
              label="Self Occupied"
              value={inputs.selfOccupied}
              onChange={set('selfOccupied')}
              hint="Interest cap ₹2L if self-occupied; full deduction if rented"
            />
          </Section>

          {/* 9. TDS & Advance Tax */}
          <Section title="TDS & Taxes Paid" icon="card" open={open.tax} onToggle={() => toggle('tax')}>
            <InputField label="TDS Deducted" value={inputs.tds} onChangeText={set('tds')} prefix="₹" />
            <InputField label="Advance Tax Paid" value={inputs.advanceTax} onChangeText={set('advanceTax')} prefix="₹" />
            <InputField label="Self Assessment Tax" value={inputs.selfAssessmentTax} onChangeText={set('selfAssessmentTax')} prefix="₹" />
          </Section>

          <PrimaryButton
            title="Calculate Tax Liability"
            onPress={calculate}
            loading={loading}
            gradient={[ACCENT, '#880E4F']}
          />

          {result && comparison && (
            <Animated.View style={{ opacity: fadeAnim }}>
              {/* Regime comparison */}
              <View style={styles.compareCard}>
                <Text style={styles.compareTitle}>Old vs New Regime</Text>
                <View style={styles.compareRow}>
                  <View style={[styles.compareCol, comparison.recommended === 'old' && styles.compareColRecommended]}>
                    <Text style={styles.compareColLabel}>OLD</Text>
                    <Text style={styles.compareColValue}>{formatINRFull(comparison.old.totalTaxLiability)}</Text>
                  </View>
                  <View style={[styles.compareCol, comparison.recommended === 'new' && styles.compareColRecommended]}>
                    <Text style={styles.compareColLabel}>NEW</Text>
                    <Text style={styles.compareColValue}>{formatINRFull(comparison.new.totalTaxLiability)}</Text>
                  </View>
                </View>
                <View style={styles.compareTip}>
                  <Ionicons name="bulb" size={14} color={COLORS.success} />
                  <Text style={styles.compareTipText}>
                    {comparison.recommended === inputs.regime
                      ? `Your selected ${inputs.regime.toUpperCase()} regime is best — saves `
                      : `Switch to ${comparison.recommended.toUpperCase()} regime to save `}
                    <Text style={{ fontWeight: '700' }}>{formatINRFull(comparison.savings)}</Text>
                  </Text>
                </View>
              </View>

              {/* Final liability headline */}
              <View style={styles.headlineCard}>
                <Text style={styles.headlineLabel}>Final Tax Liability</Text>
                <Text style={styles.headlineValue}>{formatINRFull(result.totalTaxLiability)}</Text>
                <View style={styles.headlineRow}>
                  <View style={styles.headlinePill}>
                    <Text style={styles.headlinePillLabel}>Effective Rate</Text>
                    <Text style={styles.headlinePillValue}>{formatPercent(result.effectiveRate)}</Text>
                  </View>
                  <View style={styles.headlinePill}>
                    <Text style={styles.headlinePillLabel}>{result.refund > 0 ? 'Refund' : 'Net Payable'}</Text>
                    <Text style={[styles.headlinePillValue, { color: result.refund > 0 ? COLORS.success : COLORS.warning }]}>
                      {formatINRFull(result.refund > 0 ? result.refund : result.netPayable)}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Computation breakdown */}
              <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>Computation</Text>
                <SummaryRow label="Salary Income (after HRA, std ded)" value={result.salaryIncome} />
                {result.businessIncome > 0 && (
                  <SummaryRow
                    label={`Business Income${result.businessPresumptive ? ` (${result.businessSection})` : ''}`}
                    value={result.businessIncome}
                  />
                )}
                {result.totalHouseProperty !== 0 && (
                  <SummaryRow label="House Property" value={result.totalHouseProperty} />
                )}
                {result.otherIncome > 0 && <SummaryRow label="Other Income" value={result.otherIncome} />}
                <SummaryRow label="Gross Total Income" value={result.grossTotalIncome} bold />
                <SummaryRow label="Total Deductions" value={result.totalDeductions} color={COLORS.success} />
                <SummaryRow label="Taxable Income" value={result.taxableIncome} bold />
                <View style={styles.divider} />
                <SummaryRow label="Tax on Slab Income" value={result.slabTax} />
                {result.rebate > 0 && <SummaryRow label="Less: Rebate u/s 87A" value={-result.rebate} color={COLORS.success} />}
                {result.capitalGainsTax > 0 && <SummaryRow label="Capital Gains Tax" value={result.capitalGainsTax} />}
                {result.surcharge > 0 && <SummaryRow label="Surcharge" value={result.surcharge} />}
                <SummaryRow label="Health & Education Cess (4%)" value={result.cess} />
                <View style={styles.divider} />
                <SummaryRow label="Total Tax Liability" value={result.totalTaxLiability} bold />
                {result.taxPaid > 0 && (
                  <SummaryRow label="Less: TDS & Taxes Paid" value={-result.taxPaid} color={COLORS.success} />
                )}
                <SummaryRow
                  label={result.refund > 0 ? 'Refund Due' : 'Tax Payable'}
                  value={result.refund > 0 ? result.refund : result.netPayable}
                  bold
                  color={result.refund > 0 ? COLORS.success : COLORS.warning}
                />
              </View>

              {/* Deduction breakdown */}
              {!result.restrictedInNewRegime && Object.values(result.deductionsBreakup).some((v) => v > 0) && (
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryTitle}>Deductions Breakdown</Text>
                  {Object.entries(result.deductionsBreakup)
                    .filter(([, v]) => v > 0)
                    .map(([k, v]) => (
                      <SummaryRow key={k} label={`Section ${k}`} value={v} sub />
                    ))}
                </View>
              )}

              {/* Capital gains breakdown */}
              {result.capitalGainsTax > 0 && (
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryTitle}>Capital Gains Tax Breakdown</Text>
                  {result.capitalGainsBreakup.equitySTCG > 0 && (
                    <SummaryRow label="Equity STCG (20%)" value={result.capitalGainsBreakup.equitySTCG} sub />
                  )}
                  {result.capitalGainsBreakup.equityLTCG > 0 && (
                    <SummaryRow label="Equity LTCG (12.5%)" value={result.capitalGainsBreakup.equityLTCG} sub />
                  )}
                  {result.capitalGainsBreakup.propertyLTCG > 0 && (
                    <SummaryRow label="Property LTCG (12.5%)" value={result.capitalGainsBreakup.propertyLTCG} sub />
                  )}
                  {result.capitalGainsBreakup.crypto > 0 && (
                    <SummaryRow label="Crypto / VDA (30%)" value={result.capitalGainsBreakup.crypto} sub />
                  )}
                  {result.capitalGainsBreakup.foreign > 0 && (
                    <SummaryRow label="Foreign Asset (20%)" value={result.capitalGainsBreakup.foreign} sub />
                  )}
                </View>
              )}

              {/* Tip */}
              {result.restrictedInNewRegime && (
                <View style={styles.tipBox}>
                  <Ionicons name="information-circle" size={16} color={ACCENT} />
                  <Text style={styles.tipText}>
                    Most deductions (80C, 80D, HRA, 24(b)) are not allowed under the new regime.
                    Standard deduction of ₹75,000 is auto-applied for salaried.
                  </Text>
                </View>
              )}
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
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: COLORS.card, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  back: { padding: 4, width: 30 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  headerSub: { fontSize: 11, fontWeight: '600', color: COLORS.subtext, marginTop: 2 },
  badge: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  body: { padding: 16, paddingBottom: 60 },

  regimeCard: {
    backgroundColor: COLORS.card, borderRadius: 16, padding: 16, marginBottom: 14, ...COLORS.shadow,
  },
  regimeLabel: { fontSize: 12, fontWeight: '700', color: COLORS.subtext, letterSpacing: 0.4, marginBottom: 10 },
  regimeRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  regimeBtn: {
    flex: 1, height: 42, borderRadius: 10, borderWidth: 1.5, borderColor: COLORS.border,
    justifyContent: 'center', alignItems: 'center',
  },
  regimeBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.subtext },
  regimeHint: { fontSize: 11, color: COLORS.subtext, lineHeight: 16 },

  section: {
    backgroundColor: COLORS.card, borderRadius: 16, marginBottom: 12, overflow: 'hidden', ...COLORS.shadow,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 },
  sectionLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  sectionIcon: { width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  sectionBody: { padding: 14, paddingTop: 0 },
  subHeader: {
    fontSize: 12, fontWeight: '700', color: ACCENT, marginTop: 8, marginBottom: 8,
    textTransform: 'uppercase', letterSpacing: 0.4,
  },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: COLORS.subtext, marginBottom: 6, marginTop: 4 },

  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  chip: {
    paddingHorizontal: 12, height: 32, borderRadius: 16, borderWidth: 1.5, borderColor: COLORS.border,
    justifyContent: 'center', alignItems: 'center',
  },
  chipText: { fontSize: 12, fontWeight: '600', color: COLORS.subtext },

  toggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border + '60',
  },
  toggleLabel: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  toggleHint: { fontSize: 11, color: COLORS.subtext, marginTop: 2 },
  toggleTrack: {
    width: 42, height: 24, borderRadius: 12, backgroundColor: COLORS.border, padding: 3, marginLeft: 10,
  },
  toggleThumb: {
    width: 18, height: 18, borderRadius: 9, backgroundColor: '#fff',
  },

  compareCard: {
    backgroundColor: COLORS.card, borderRadius: 16, padding: 16, marginTop: 14, ...COLORS.shadow,
  },
  compareTitle: { fontSize: 13, fontWeight: '700', color: COLORS.text, marginBottom: 12, letterSpacing: 0.3 },
  compareRow: { flexDirection: 'row', gap: 10 },
  compareCol: {
    flex: 1, padding: 14, borderRadius: 12, borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center',
  },
  compareColRecommended: { borderColor: COLORS.success, backgroundColor: COLORS.success + '10' },
  compareColLabel: { fontSize: 11, fontWeight: '700', color: COLORS.subtext, marginBottom: 6, letterSpacing: 0.5 },
  compareColValue: { fontSize: 17, fontWeight: '800', color: COLORS.text },
  compareTip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, padding: 10,
    backgroundColor: COLORS.success + '12', borderRadius: 10,
  },
  compareTipText: { fontSize: 11.5, color: COLORS.text, flex: 1, lineHeight: 16 },

  headlineCard: {
    backgroundColor: ACCENT, borderRadius: 16, padding: 18, marginTop: 12,
  },
  headlineLabel: { fontSize: 12, color: '#fff', opacity: 0.85, fontWeight: '700', letterSpacing: 0.5 },
  headlineValue: { fontSize: 30, fontWeight: '800', color: '#fff', marginTop: 6 },
  headlineRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  headlinePill: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.15)', padding: 10, borderRadius: 10,
  },
  headlinePillLabel: { fontSize: 10, color: '#fff', opacity: 0.85, fontWeight: '700', letterSpacing: 0.5 },
  headlinePillValue: { fontSize: 15, fontWeight: '800', color: '#fff', marginTop: 4 },

  summaryCard: {
    backgroundColor: COLORS.card, borderRadius: 16, padding: 16, marginTop: 12, ...COLORS.shadow,
  },
  summaryTitle: { fontSize: 13, fontWeight: '700', color: COLORS.text, marginBottom: 10, letterSpacing: 0.3 },
  sumRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  sumLabel: { fontSize: 13, color: COLORS.text, flex: 1 },
  sumLabelSub: { fontSize: 12, color: COLORS.subtext },
  sumValue: { fontSize: 13, color: COLORS.text, fontWeight: '600' },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 6 },

  tipBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: ACCENT + '12', borderRadius: 12, padding: 12, marginTop: 12,
  },
  tipText: { fontSize: 12, color: COLORS.text, flex: 1, lineHeight: 18 },
});
