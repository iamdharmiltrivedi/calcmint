// ─── EMI ──────────────────────────────────────────────────────────────────────
// Formula: EMI = P × r × (1+r)^n / ((1+r)^n - 1)
// P = principal, r = monthly rate, n = months
// Safely returns zeros for invalid or empty inputs (e.g. while the user is typing).
export const calculateEMI = (principal, annualRate, months) => {
  const P = Number(principal) || 0;
  const annual = Number(annualRate);
  const n = Number(months) || 0;
  if (P <= 0 || n <= 0 || isNaN(annual)) {
    return { emi: 0, totalAmount: 0, totalInterest: 0 };
  }
  const r = annual / 12 / 100;
  if (r === 0) {
    const emi = P / n;
    return { emi, totalAmount: P, totalInterest: 0 };
  }
  const power = Math.pow(1 + r, n);
  const emi = (P * r * power) / (power - 1);
  const totalAmount = emi * n;
  const totalInterest = totalAmount - P;
  return { emi, totalAmount, totalInterest };
};

// ─── SIP ──────────────────────────────────────────────────────────────────────
// Formula: FV = P × [((1+r)^n - 1) / r] × (1+r)
// P = monthly SIP, r = monthly rate, n = total months
export const calculateSIP = (monthly, annualRate, years) => {
  const n = years * 12;
  const r = annualRate / 12 / 100;
  if (r === 0) {
    const invested = monthly * n;
    return { futureValue: invested, invested, returns: 0 };
  }
  const fv = monthly * ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
  const invested = monthly * n;
  const returns = fv - invested;
  return { futureValue: fv, invested, returns };
};

// ─── LUMPSUM ──────────────────────────────────────────────────────────────────
// Formula: A = P × (1 + r)^n  (annual compounding CAGR)
export const calculateLumpsum = (principal, annualRate, years) => {
  const fv = principal * Math.pow(1 + annualRate / 100, years);
  const returns = fv - principal;
  return { futureValue: fv, invested: principal, returns };
};

// ─── FD ───────────────────────────────────────────────────────────────────────
// Formula: A = P × (1 + r/n)^(n×t)
// compounding: 1 = annually, 4 = quarterly, 12 = monthly
export const calculateFD = (principal, annualRate, years, compounding = 4) => {
  const r = annualRate / 100;
  const n = compounding;
  const fv = principal * Math.pow(1 + r / n, n * years);
  const returns = fv - principal;
  return { futureValue: fv, invested: principal, returns };
};

// ─── RD ───────────────────────────────────────────────────────────────────────
// Uses monthly compounding SIP-equivalent formula (standard Indian RD approximation)
export const calculateRD = (monthly, annualRate, years) => {
  const n = years * 12;
  const r = annualRate / 12 / 100;
  if (r === 0) {
    const invested = monthly * n;
    return { maturity: invested, invested, returns: 0 };
  }
  const fv = monthly * ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
  const invested = monthly * n;
  const returns = fv - invested;
  return { maturity: fv, invested, returns };
};

// ─── PPF ──────────────────────────────────────────────────────────────────────
// PPF compounds annually at the declared rate (7.1% as of 2024)
// Each year: balance = (previous_balance + deposit) × (1 + rate)
export const calculatePPF = (yearlyDeposit, years, rate = 7.1) => {
  const r = rate / 100;
  let balance = 0;
  const yearlyData = [];
  for (let i = 1; i <= years; i++) {
    balance = (balance + yearlyDeposit) * (1 + r);
    yearlyData.push({ year: i, balance: Math.round(balance) });
  }
  const invested = yearlyDeposit * years;
  const returns = balance - invested;
  return { maturity: balance, invested, returns, yearlyData };
};

// ─── TAX SAVINGS (80C) ────────────────────────────────────────────────────────
// Section 80C maximum deduction = ₹1,50,000
export const calculateTaxSavings = (income, investments, taxRate) => {
  const MAX_80C = 150000;
  const eligible = Math.min(investments, MAX_80C);
  const taxSaved = (eligible * taxRate) / 100;
  const remainingDeduction = Math.max(0, MAX_80C - investments);
  const additionalTaxIfInvested = (remainingDeduction * taxRate) / 100;
  return { taxSaved, eligible, remainingDeduction, additionalTaxIfInvested, MAX_80C };
};

// ═══════════════════════════════════════════════════════════════════════════
// INCOME TAX RETURN (ITR) ENGINE — FY 2025-26 / AY 2026-27
// ═══════════════════════════════════════════════════════════════════════════

const num = (v) => {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
};

// ─── SLAB TAX ─────────────────────────────────────────────────────────────────
const applySlabs = (income, slabs) => {
  let tax = 0;
  let prev = 0;
  for (const [limit, rate] of slabs) {
    if (income <= prev) break;
    const upper = limit === Infinity ? income : Math.min(income, limit);
    tax += Math.max(0, upper - prev) * rate;
    prev = limit;
    if (income <= limit) break;
  }
  return tax;
};

// New regime slabs (Budget 2025, FY 2025-26 onwards)
const NEW_REGIME_SLABS = [
  [400000, 0],
  [800000, 0.05],
  [1200000, 0.10],
  [1600000, 0.15],
  [2000000, 0.20],
  [2400000, 0.25],
  [Infinity, 0.30],
];

// Old regime slabs vary by age band
const oldRegimeSlabs = (age) => {
  if (age >= 80) {
    return [
      [500000, 0],
      [1000000, 0.20],
      [Infinity, 0.30],
    ];
  }
  if (age >= 60) {
    return [
      [300000, 0],
      [500000, 0.05],
      [1000000, 0.20],
      [Infinity, 0.30],
    ];
  }
  return [
    [250000, 0],
    [500000, 0.05],
    [1000000, 0.20],
    [Infinity, 0.30],
  ];
};

// ─── SURCHARGE ────────────────────────────────────────────────────────────────
const surchargeRate = (totalIncome, regime) => {
  if (totalIncome <= 5000000) return 0;
  if (totalIncome <= 10000000) return 0.10;
  if (totalIncome <= 20000000) return 0.15;
  if (totalIncome <= 50000000) return 0.25;
  return regime === 'new' ? 0.25 : 0.37; // new regime caps at 25%
};

// ─── 87A REBATE ───────────────────────────────────────────────────────────────
const rebate87A = (taxableIncome, taxOnSlab, regime) => {
  if (regime === 'new') {
    // FY 2025-26: full rebate up to ₹12L, max ₹60,000
    if (taxableIncome <= 1200000) return Math.min(taxOnSlab, 60000);
    return 0;
  }
  // Old regime: full rebate up to ₹5L, max ₹12,500
  if (taxableIncome <= 500000) return Math.min(taxOnSlab, 12500);
  return 0;
};

// ─── HRA EXEMPTION ────────────────────────────────────────────────────────────
// Exemption = least of: HRA received, rent paid - 10% of basic, 50%/40% of basic
export const calculateHRAExemption = ({ basic, hraReceived, rentPaid, metro }) => {
  const b = num(basic);
  const hra = num(hraReceived);
  const rent = num(rentPaid);
  if (b <= 0 || hra <= 0) return 0;
  const limit1 = hra;
  const limit2 = Math.max(0, rent - 0.10 * b);
  const limit3 = (metro ? 0.50 : 0.40) * b;
  return Math.min(limit1, limit2, limit3);
};

// ─── CAPITAL GAINS TAX (separate from slab) ───────────────────────────────────
// FY 2024-25 onwards (Budget 2024):
//   Equity STCG (111A): 20%
//   Equity LTCG (112A): 12.5% on gains > ₹1.25L
//   Property/other LTCG: 12.5% (without indexation)
//   Crypto / VDA: 30% flat
export const calculateCapitalGainsTax = (cg = {}) => {
  const equitySTCG = num(cg.equitySTCG);
  const equityLTCG = num(cg.equityLTCG);
  const mfGains = num(cg.mfGains); // treated as equity LTCG
  const propertyGain = num(cg.propertyGain);
  const cryptoIncome = num(cg.cryptoIncome);
  const foreignAssetGain = num(cg.foreignAssetGain);

  const ltcgEquityTotal = equityLTCG + mfGains;
  const ltcgEquityExempt = Math.min(125000, ltcgEquityTotal);
  const ltcgEquityTaxable = Math.max(0, ltcgEquityTotal - ltcgEquityExempt);

  const taxEquitySTCG = equitySTCG * 0.20;
  const taxEquityLTCG = ltcgEquityTaxable * 0.125;
  const taxPropertyLTCG = propertyGain * 0.125;
  const taxCrypto = cryptoIncome * 0.30;
  const taxForeign = foreignAssetGain * 0.20; // simplified

  const totalCGTax = taxEquitySTCG + taxEquityLTCG + taxPropertyLTCG + taxCrypto + taxForeign;
  const totalCGIncome =
    equitySTCG + equityLTCG + mfGains + propertyGain + cryptoIncome + foreignAssetGain;

  return {
    totalCGIncome,
    totalCGTax,
    breakup: {
      equitySTCG: taxEquitySTCG,
      equityLTCG: taxEquityLTCG,
      propertyLTCG: taxPropertyLTCG,
      crypto: taxCrypto,
      foreign: taxForeign,
    },
  };
};

// ─── PRESUMPTIVE BUSINESS INCOME ──────────────────────────────────────────────
// 44ADA (professionals): 50% of gross receipts deemed as profit
// 44AD (small business): 8% (cash) / 6% (digital) deemed profit
export const calculateBusinessIncome = (b = {}) => {
  const revenue = num(b.grossRevenue);
  const receipts = num(b.grossReceipts);
  const expenses = num(b.expenses);
  const depreciation = num(b.depreciation);

  if (b.section44ADA) {
    return { netProfit: receipts * 0.50, presumptive: true, section: '44ADA' };
  }
  if (b.section44AD) {
    return { netProfit: revenue * 0.06, presumptive: true, section: '44AD' };
  }
  const netProfit = revenue + receipts - expenses - depreciation;
  return { netProfit: Math.max(0, netProfit), presumptive: false };
};

// ─── DEDUCTIONS (old regime — most are restricted in new regime) ──────────────
const DEDUCTION_CAPS = {
  '80C': 150000,
  '80CCD1B': 50000,
  '80D_self_below60': 25000,
  '80D_self_senior': 50000,
  '80D_parents_below60': 25000,
  '80D_parents_senior': 50000,
  '80D_checkup': 5000,
  '80TTA': 10000,
  '80TTB': 50000,
  '80EEA': 150000,
  '80U_normal': 75000,
  '80U_severe': 125000,
  '80DD_normal': 75000,
  '80DD_severe': 125000,
  '24b_selfOccupied': 200000,
};

export const calculateDeductions = (d = {}, age = 30, regime = 'old') => {
  // Most deductions are disallowed under new regime
  if (regime === 'new') {
    return { total: 0, breakup: {}, restrictedInNewRegime: true };
  }

  const isSenior = age >= 60;

  // 80C bucket
  const total80C =
    num(d.epf) + num(d.ppf) + num(d.elss) + num(d.lifeInsurance) +
    num(d.homeLoanPrincipal) + num(d.sukanya) + num(d.taxSaverFD) + num(d.nps80CCD1);
  const ded80C = Math.min(DEDUCTION_CAPS['80C'], total80C);

  // 80CCD(1B) — extra NPS
  const ded80CCD1B = Math.min(DEDUCTION_CAPS['80CCD1B'], num(d.nps80CCD1B));

  // 80D — health insurance
  const selfCap = isSenior ? DEDUCTION_CAPS['80D_self_senior'] : DEDUCTION_CAPS['80D_self_below60'];
  const parentCap = d.parentsSenior
    ? DEDUCTION_CAPS['80D_parents_senior']
    : DEDUCTION_CAPS['80D_parents_below60'];
  const ded80Dself = Math.min(selfCap, num(d.medicalSelf));
  const ded80Dparents = Math.min(parentCap, num(d.medicalParents));
  const ded80Dcheckup = Math.min(DEDUCTION_CAPS['80D_checkup'], num(d.healthCheckup));
  const ded80D = ded80Dself + ded80Dparents + ded80Dcheckup;

  // 80E — full deduction on education loan interest
  const ded80E = num(d.educationLoanInterest);

  // 80EEA — first-time home buyer, additional ₹1.5L
  const ded80EEA = Math.min(DEDUCTION_CAPS['80EEA'], num(d.homeLoanInterest80EEA));

  // 80G — donations (assume 100% qualifying for simplicity)
  const ded80G = num(d.donations);

  // 80TTA / 80TTB — interest on deposits
  const ded80TTA = isSenior ? 0 : Math.min(DEDUCTION_CAPS['80TTA'], num(d.savingsInterest));
  const ded80TTB = isSenior ? Math.min(DEDUCTION_CAPS['80TTB'], num(d.seniorInterest)) : 0;

  // 80U — disability (self)
  let ded80U = 0;
  if (d.disabilitySelf === 'normal') ded80U = DEDUCTION_CAPS['80U_normal'];
  else if (d.disabilitySelf === 'severe') ded80U = DEDUCTION_CAPS['80U_severe'];

  // 80DD — dependent disability
  let ded80DD = 0;
  if (d.disabilityDependent === 'normal') ded80DD = DEDUCTION_CAPS['80DD_normal'];
  else if (d.disabilityDependent === 'severe') ded80DD = DEDUCTION_CAPS['80DD_severe'];

  // Section 24(b) — home loan interest
  const homeLoanInterest = num(d.homeLoanInterest);
  const ded24b = d.selfOccupied
    ? Math.min(DEDUCTION_CAPS['24b_selfOccupied'], homeLoanInterest)
    : homeLoanInterest;

  const breakup = {
    '80C': ded80C,
    '80CCD(1B)': ded80CCD1B,
    '80D': ded80D,
    '80E': ded80E,
    '80EEA': ded80EEA,
    '80G': ded80G,
    '80TTA': ded80TTA,
    '80TTB': ded80TTB,
    '80U': ded80U,
    '80DD': ded80DD,
    '24(b)': ded24b,
  };
  const total = Object.values(breakup).reduce((a, b) => a + b, 0);
  return { total, breakup };
};

// ─── FULL ITR COMPUTATION ─────────────────────────────────────────────────────
export const calculateITR = (input) => {
  const {
    age = 30,
    regime = 'new',
    salary = {},
    hra = {},
    business = {},
    capitalGains = {},
    otherIncome = {},
    deductions = {},
    taxesPaid = {},
  } = input;

  // ── Salary income
  const salaryGross =
    num(salary.basic) + num(salary.hraReceived) + num(salary.lta) + num(salary.bonus) +
    num(salary.specialAllowance) + num(salary.otherAllowances) + num(salary.perquisites) +
    num(salary.gratuity) + num(salary.pension);

  // HRA exemption only under old regime
  const hraExemption = regime === 'old'
    ? calculateHRAExemption({
        basic: hra.basicForHRA || salary.basic,
        hraReceived: hra.hraReceived || salary.hraReceived,
        rentPaid: hra.rentPaid,
        metro: hra.metro,
      })
    : 0;

  const standardDeduction = salaryGross > 0
    ? (regime === 'new' ? 75000 : 50000)
    : 0;
  const professionalTax = regime === 'old' ? num(salary.professionalTax) : 0;
  const salaryIncome = Math.max(0, salaryGross - hraExemption - standardDeduction - professionalTax);

  // ── Business income
  const businessRes = calculateBusinessIncome(business);
  const businessIncome = businessRes.netProfit;

  // ── House property (rental + home loan interest)
  const rentalIncome = num(otherIncome.rentalIncome);
  const rentalStandardDed = rentalIncome * 0.30; // 30% standard deduction u/s 24(a)
  const homeLoanInterestRental = !deductions.selfOccupied ? num(deductions.homeLoanInterest) : 0;
  const housePropertyIncome = rentalIncome - rentalStandardDed - homeLoanInterestRental;
  // Loss from self-occupied house = -interest (capped at 2L u/s 24(b))
  const selfOccupiedLoss = deductions.selfOccupied
    ? -Math.min(200000, num(deductions.homeLoanInterest))
    : 0;
  const totalHouseProperty = housePropertyIncome + selfOccupiedLoss;

  // ── Other income (added to slab)
  const otherInc =
    num(otherIncome.interestIncome) + num(otherIncome.fdInterest) +
    num(otherIncome.savingsInterest) + num(otherIncome.dividend) +
    num(otherIncome.familyPension) + num(otherIncome.lottery) +
    num(otherIncome.giftsReceived);
  // Agricultural income is exempt but used for rate purposes (we exempt fully for simplicity)

  // ── Capital gains (separate tax)
  const cgRes = calculateCapitalGainsTax(capitalGains);

  // ── Gross Total Income (excluding capital gains, which is taxed separately)
  const grossTotalIncome = Math.max(
    0,
    salaryIncome + businessIncome + totalHouseProperty + otherInc
  );

  // ── Deductions
  const dedRes = calculateDeductions(deductions, age, regime);
  const totalDeductions = Math.min(dedRes.total, grossTotalIncome);

  // ── Taxable income (slab)
  const taxableIncome = Math.max(0, grossTotalIncome - totalDeductions);

  // ── Slab tax
  const slabs = regime === 'new' ? NEW_REGIME_SLABS : oldRegimeSlabs(age);
  const slabTax = applySlabs(taxableIncome, slabs);

  // ── Rebate u/s 87A
  const rebate = rebate87A(taxableIncome, slabTax, regime);
  const slabTaxAfterRebate = Math.max(0, slabTax - rebate);

  // ── Total tax (slab + capital gains)
  const taxBeforeSurcharge = slabTaxAfterRebate + cgRes.totalCGTax;

  // ── Surcharge (based on total income including CG)
  const totalIncomeForSurcharge = taxableIncome + cgRes.totalCGIncome;
  const surcharge = taxBeforeSurcharge * surchargeRate(totalIncomeForSurcharge, regime);

  // ── Health & Education Cess @ 4%
  const cess = (taxBeforeSurcharge + surcharge) * 0.04;

  // ── Final liability
  const totalTaxLiability = taxBeforeSurcharge + surcharge + cess;

  // ── TDS / Advance Tax
  const taxPaid =
    num(taxesPaid.tds) + num(taxesPaid.advanceTax) + num(taxesPaid.selfAssessmentTax);
  const netPayable = totalTaxLiability - taxPaid;

  const effectiveRate = grossTotalIncome + cgRes.totalCGIncome > 0
    ? (totalTaxLiability / (grossTotalIncome + cgRes.totalCGIncome)) * 100
    : 0;

  return {
    regime,
    salaryGross,
    hraExemption,
    standardDeduction,
    professionalTax,
    salaryIncome,
    businessIncome,
    businessPresumptive: businessRes.presumptive,
    businessSection: businessRes.section,
    rentalIncome,
    totalHouseProperty,
    otherIncome: otherInc,
    capitalGainsIncome: cgRes.totalCGIncome,
    capitalGainsTax: cgRes.totalCGTax,
    capitalGainsBreakup: cgRes.breakup,
    grossTotalIncome,
    deductionsBreakup: dedRes.breakup || {},
    totalDeductions,
    restrictedInNewRegime: !!dedRes.restrictedInNewRegime,
    taxableIncome,
    slabTax,
    rebate,
    surcharge,
    cess,
    totalTaxLiability,
    taxPaid,
    netPayable: netPayable > 0 ? netPayable : 0,
    refund: netPayable < 0 ? -netPayable : 0,
    effectiveRate,
  };
};

// ─── REGIME COMPARISON ────────────────────────────────────────────────────────
export const compareRegimes = (input) => {
  const oldRes = calculateITR({ ...input, regime: 'old' });
  const newRes = calculateITR({ ...input, regime: 'new' });
  const savings = oldRes.totalTaxLiability - newRes.totalTaxLiability;
  return {
    old: oldRes,
    new: newRes,
    recommended: savings > 0 ? 'new' : 'old',
    savings: Math.abs(savings),
  };
};

// ─── GOAL PLANNER (SIP required) ─────────────────────────────────────────────
// Monthly SIP = Goal × r / [((1+r)^n - 1) × (1+r)]
export const calculateGoalSIP = (goalAmount, years, expectedRate) => {
  const n = years * 12;
  const r = expectedRate / 12 / 100;
  if (r === 0) {
    const monthlySIP = goalAmount / n;
    return { monthlySIP, totalInvested: goalAmount, returns: 0 };
  }
  const monthlySIP = (goalAmount * r) / ((Math.pow(1 + r, n) - 1) * (1 + r));
  const totalInvested = monthlySIP * n;
  const returns = goalAmount - totalInvested;
  return { monthlySIP, totalInvested, returns };
};

// ─── BUDGET 50/30/20 ──────────────────────────────────────────────────────────
export const calculateBudget = (monthlyIncome) => ({
  needs: monthlyIncome * 0.5,
  wants: monthlyIncome * 0.3,
  savings: monthlyIncome * 0.2,
});
