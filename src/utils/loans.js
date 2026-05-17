import { calculateEMI } from './calculations';

// Returns the next occurrence of `emiDay` from today (or today if not yet passed).
export function nextEmiDate(emiDay, from = new Date()) {
  if (!emiDay) return null;
  const d = new Date(from);
  d.setHours(0, 0, 0, 0);
  // Clamp emiDay to 1..28 so every month has it
  const day = Math.max(1, Math.min(28, Math.floor(emiDay)));
  const candidate = new Date(d.getFullYear(), d.getMonth(), day);
  if (candidate < d) {
    candidate.setMonth(candidate.getMonth() + 1);
  }
  return candidate;
}

// Days until the next EMI. Negative if overdue, 0 if today.
export function daysUntilNextEmi(emiDay, from = new Date()) {
  const next = nextEmiDate(emiDay, from);
  if (!next) return null;
  const a = new Date(from); a.setHours(0, 0, 0, 0);
  return Math.round((next - a) / 86400000);
}

// Months elapsed since the loan started (floor).
export function monthsElapsed(startISO, from = new Date()) {
  if (!startISO) return 0;
  const s = new Date(startISO);
  const months = (from.getFullYear() - s.getFullYear()) * 12 + (from.getMonth() - s.getMonth());
  return Math.max(0, months);
}

// Returns EMI math + tenure progress for a loan record.
export function summarizeLoan(loan, from = new Date()) {
  if (!loan) return null;
  const { principal = 0, rate = 0, tenureMonths = 0, startDate, emiDay } = loan;
  const { emi, totalAmount, totalInterest } = calculateEMI(principal, rate, tenureMonths);
  const elapsed = monthsElapsed(startDate, from);
  const remaining = Math.max(0, tenureMonths - elapsed);
  const nextDate = nextEmiDate(emiDay, from);
  const daysLeft = daysUntilNextEmi(emiDay, from);
  return {
    emi,
    totalAmount,
    totalInterest,
    elapsed,
    remaining,
    nextDate,
    daysLeft,
    isClosed: remaining === 0,
  };
}

export function totalMonthlyObligation(loans, from = new Date()) {
  if (!loans?.length) return 0;
  let sum = 0;
  for (const l of loans) {
    const s = summarizeLoan(l, from);
    if (s && !s.isClosed) sum += s.emi;
  }
  return sum;
}
