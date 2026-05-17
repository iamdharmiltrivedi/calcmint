// Heuristic parsing of OCR text from Indian receipts/bills/invoices.
// All functions are pure — easy to unit test, no React/RN imports.

const CURRENCY_AMOUNT = /(?:₹|Rs\.?|INR\.?)\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)/gi;
const PLAIN_NUMBER    = /\b([0-9][0-9,]{1,}(?:\.[0-9]{1,2})?)\b/g;

const TOTAL_KEYWORDS = /(grand\s*total|total\s*amount|net\s*payable|amount\s*payable|invoice\s*total|bill\s*total|net\s*amount|amount\s*due|\btotal\b)/i;
// Lines that mention these tend to NOT be the line total we want.
const NON_TOTAL_HINT = /(sub[\s-]*total|cgst|sgst|igst|gst|tax|discount|round[\s-]*off|qty|quantity|mrp\b|saved|cash\s*back|cashback)/i;

const MONTH_SHORT = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];

const parseAmountToken = (s) => {
  const n = parseFloat(String(s).replace(/,/g, ''));
  return isNaN(n) ? null : n;
};

// ─── Amount ──────────────────────────────────────────────────────────────────
export function extractAmount(text) {
  if (!text) return null;
  const lines = text.split(/\r?\n/);

  // Pass 1: lines mentioning a total keyword (and NOT mentioning a non-total hint)
  const totalCandidates = [];
  for (const line of lines) {
    if (!TOTAL_KEYWORDS.test(line)) continue;
    if (NON_TOTAL_HINT.test(line) && !/grand\s*total|net\s*payable/i.test(line)) continue;

    const found = [];
    let m;
    CURRENCY_AMOUNT.lastIndex = 0;
    while ((m = CURRENCY_AMOUNT.exec(line)) !== null) {
      const v = parseAmountToken(m[1]);
      if (v != null && v > 0) found.push(v);
    }
    if (found.length === 0) {
      PLAIN_NUMBER.lastIndex = 0;
      while ((m = PLAIN_NUMBER.exec(line)) !== null) {
        const v = parseAmountToken(m[1]);
        if (v != null && v > 0) found.push(v);
      }
    }
    if (found.length > 0) totalCandidates.push(Math.max(...found));
  }
  if (totalCandidates.length > 0) {
    // Prefer the LAST total line (usually the final total at the bottom of the receipt)
    return totalCandidates[totalCandidates.length - 1];
  }

  // Pass 2: any explicit currency token in the whole text → pick the largest
  const allCurrency = [];
  let m;
  CURRENCY_AMOUNT.lastIndex = 0;
  while ((m = CURRENCY_AMOUNT.exec(text)) !== null) {
    const v = parseAmountToken(m[1]);
    if (v != null && v > 0) allCurrency.push(v);
  }
  if (allCurrency.length > 0) return Math.max(...allCurrency);

  return null;
}

// ─── Date ────────────────────────────────────────────────────────────────────
const DATE_NUMERIC = /\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})\b/;
const DATE_WORDED  = /\b(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{2,4})\b/i;

export function extractDate(text) {
  if (!text) return null;

  // Prefer dates near "Invoice Date", "Bill Date", "Date" keywords
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    if (!/\b(date|dated|invoice\s*date|bill\s*date|issued)/i.test(line)) continue;
    const d = parseLineDate(line);
    if (d) return d.toISOString();
  }
  // Otherwise, the first matching date in the document
  const d = parseLineDate(text);
  return d ? d.toISOString() : null;
}

function parseLineDate(s) {
  let m = s.match(DATE_NUMERIC);
  if (m) {
    let d = parseInt(m[1], 10);
    let mo = parseInt(m[2], 10) - 1;
    let y = parseInt(m[3], 10);
    if (y < 100) y += 2000;
    // Sanity: many Indian receipts use DD/MM/YYYY; if "day" > 12 swap is impossible anyway.
    // If first number > 12, definitely DD-first. If second > 12, that's the year-style format.
    if (d > 31 && mo <= 11) { const t = d; d = mo + 1; mo = t - 1; }
    if (mo > 11 || d > 31) return null;
    const dt = new Date(y, mo, d);
    return isNaN(dt) ? null : dt;
  }
  m = s.match(DATE_WORDED);
  if (m) {
    const d = parseInt(m[1], 10);
    const mo = MONTH_SHORT.indexOf(m[2].slice(0, 3).toLowerCase());
    let y = parseInt(m[3], 10);
    if (y < 100) y += 2000;
    if (mo < 0) return null;
    const dt = new Date(y, mo, d);
    return isNaN(dt) ? null : dt;
  }
  return null;
}

// ─── Vendor ──────────────────────────────────────────────────────────────────
// Vendor name is usually one of the top few lines. Prefer the longest line with
// mostly letters and that isn't a phone number, GSTIN, address, or amount.
export function extractVendor(text) {
  if (!text) return null;
  const lines = text.split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length >= 3);
  const top = lines.slice(0, 6);

  const scored = top
    .map((l) => ({ l, score: scoreVendorLine(l) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) return null;
  return scored[0].l;
}

function scoreVendorLine(line) {
  // Reject lines that look like amounts, phone, GSTIN, dates, address-ish
  if (/^\s*(?:₹|rs\.?|inr)/i.test(line)) return 0;
  if (/\b\d{10,}\b/.test(line)) return 0; // phone / long ID
  if (/^\d/.test(line) && /\d{3,}/.test(line)) return 0; // starts numeric
  if (DATE_NUMERIC.test(line) || DATE_WORDED.test(line)) return 0;
  if (/gstin|cin\b|pan\b|fssai/i.test(line)) return 0;

  const letters = (line.match(/[A-Za-z]/g) || []).length;
  const digits  = (line.match(/\d/g) || []).length;
  if (letters < 3) return 0;
  // Letter-heavy wins
  return letters - digits * 2;
}

// ─── Combined ────────────────────────────────────────────────────────────────
export function parseReceipt(text) {
  return {
    vendor: extractVendor(text),
    amount: extractAmount(text),
    date:   extractDate(text),
  };
}
