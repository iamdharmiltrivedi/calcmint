import { CATEGORY } from './colors';

// Each calculator has a `group` field used by the Tools screen to render
// sectioned headers. Keep order within a group reflecting the design's
// preferred top-down sequence.
export const CALC_GROUPS = [
  { id: 'loans',       title: 'Loans & EMI' },
  { id: 'investments', title: 'Investments' },
  { id: 'planning',    title: 'Tax & Planning' },
];

// Each calculator gets a category accent (color + soft tint), a one-line
// description, an NL-search keyword set, and a group id.
export const CALCULATORS = [
  // ── Loans & EMI ──────────────────────────────────────────────────────
  {
    id: 'home_loan', group: 'loans',
    title: 'Home Loan', icon: 'home',
    description: 'EMI & total interest payable',
    keywords: ['home', 'loan', 'house', 'mortgage', 'emi', 'property'],
    color: CATEGORY.blue.c, softColor: CATEGORY.blue.soft,
    screen: 'HomeLoanCalculator',
  },
  {
    id: 'emi', group: 'loans',
    title: 'EMI', icon: 'calculator',
    description: 'Monthly repayment for any loan',
    keywords: ['emi', 'loan', 'instalment', 'car', 'personal', 'repay'],
    color: CATEGORY.violet.c, softColor: CATEGORY.violet.soft,
    screen: 'EMICalculator',
  },

  // ── Investments ──────────────────────────────────────────────────────
  {
    id: 'sip', group: 'investments',
    title: 'SIP', icon: 'trending-up',
    description: 'Monthly investment growth',
    keywords: ['sip', 'mutual fund', 'monthly', 'invest', 'systematic'],
    color: CATEGORY.green.c, softColor: CATEGORY.green.soft,
    screen: 'SIPCalculator',
  },
  {
    id: 'lumpsum', group: 'investments',
    title: 'Lumpsum', icon: 'cash',
    description: 'One-time investment returns',
    keywords: ['lumpsum', 'one time', 'invest', 'fd alternative'],
    color: CATEGORY.clay.c, softColor: CATEGORY.clay.soft,
    screen: 'LumpsumCalculator',
  },
  {
    id: 'fd', group: 'investments',
    title: 'Fixed Deposit', icon: 'business',
    description: 'FD maturity & interest',
    keywords: ['fd', 'fixed deposit', 'bank', 'interest'],
    color: CATEGORY.teal.c, softColor: CATEGORY.teal.soft,
    screen: 'FDCalculator',
  },
  {
    id: 'rd', group: 'investments',
    title: 'Recurring Deposit', icon: 'repeat',
    description: 'Monthly RD with bank interest',
    keywords: ['rd', 'recurring', 'deposit', 'monthly bank'],
    color: CATEGORY.brown.c, softColor: CATEGORY.brown.soft,
    screen: 'RDCalculator',
  },
  {
    id: 'ppf', group: 'investments',
    title: 'PPF', icon: 'shield-checkmark',
    description: '15-year tax-free corpus',
    keywords: ['ppf', 'public provident fund', 'tax free', '15 year'],
    color: CATEGORY.indigo.c, softColor: CATEGORY.indigo.soft,
    screen: 'PPFCalculator',
  },

  // ── Tax & Planning ───────────────────────────────────────────────────
  {
    id: 'tax', group: 'planning',
    title: 'ITR Calculator', icon: 'receipt',
    description: 'Old vs new regime tax',
    keywords: ['tax', 'itr', 'income tax', '80c', 'regime'],
    color: CATEGORY.rose.c, softColor: CATEGORY.rose.soft,
    screen: 'TaxSavingsCalculator',
  },
  {
    id: 'goal', group: 'planning',
    title: 'Goal Planner', icon: 'flag',
    description: 'Monthly SIP to hit a goal',
    keywords: ['goal', 'plan', 'sip needed', 'target', 'corpus'],
    color: CATEGORY.amber.c, softColor: CATEGORY.amber.soft,
    screen: 'GoalPlannerCalculator',
  },
  {
    id: 'budget', group: 'planning',
    title: 'Budget', icon: 'pie-chart',
    description: '50 / 30 / 20 monthly split',
    keywords: ['budget', '50 30 20', 'monthly', 'spend split'],
    color: CATEGORY.orange.c, softColor: CATEGORY.orange.soft,
    screen: 'BudgetCalculator',
  },
  {
    id: 'retirement', group: 'planning',
    title: 'Retirement', icon: 'bed-outline',
    description: 'Plan your retirement corpus',
    keywords: ['retirement', 'corpus', 'pension', 'old age'],
    color: CATEGORY.indigo.c, softColor: CATEGORY.indigo.soft,
    screen: 'RetirementCalculator',
  },
  {
    id: 'unit_converter', group: 'planning',
    title: 'Unit Converter', icon: 'git-compare-outline',
    description: 'Length, area, weight, more',
    keywords: ['unit', 'convert', 'length', 'weight', 'area', 'sqft'],
    color: CATEGORY.teal.c, softColor: CATEGORY.teal.soft,
    screen: 'UnitConverter',
  },
  {
    id: 'invoice', group: 'planning',
    title: 'Invoice Generator', icon: 'receipt-outline',
    description: 'GST invoices for freelancers',
    keywords: ['invoice', 'bill', 'gst', 'freelance', 'sgst', 'cgst'],
    color: CATEGORY.blue.c, softColor: CATEGORY.blue.soft,
    screen: 'InvoiceGenerator',
  },
];

// Lightweight natural-language matcher for the search bar. We tokenise
// the query, then score each calculator by how many of its keywords +
// title words match. Anything with score >= 1 returns, sorted by score.
export const searchCalculators = (query) => {
  if (!query || !query.trim()) return CALCULATORS;
  const q = query.toLowerCase();
  const tokens = q.split(/[^a-z0-9]+/).filter((t) => t.length > 1);
  if (!tokens.length) return CALCULATORS;

  const scored = CALCULATORS.map((c) => {
    const hay = [
      c.title.toLowerCase(),
      c.description.toLowerCase(),
      ...(c.keywords || []),
    ].join(' ');
    let score = 0;
    for (const t of tokens) if (hay.includes(t)) score += 1;
    return { calc: c, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((s) => s.calc);
};
