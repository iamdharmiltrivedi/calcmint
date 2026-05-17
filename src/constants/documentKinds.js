// Document categories. Each scanned image is tagged with one `kind` key.
// Old entries created before this feature default to 'receipt' for backward compat.
export const DOC_KINDS = {
  bill: {
    label: 'Bill',
    icon: 'flash-outline',
    color: '#2E5BFF',
    soft: '#E7EDFE',
  },
  invoice: {
    label: 'Invoice',
    icon: 'document-outline',
    color: '#6F4FE0',
    soft: '#EFE9FC',
  },
  loan: {
    label: 'Loan paper',
    icon: 'document-text-outline',
    color: '#7C5C44',
    soft: '#EFE6DD',
  },
  warranty: {
    label: 'Warranty',
    icon: 'shield-checkmark-outline',
    color: '#218A52',
    soft: '#DDEFE3',
  },
  receipt: {
    label: 'Receipt',
    icon: 'receipt-outline',
    color: '#D97A3A',
    soft: '#FAEADC',
  },
  other: {
    label: 'Other',
    icon: 'folder-outline',
    color: '#6B7B72',
    soft: '#EFEFEF',
  },
};

export const DOC_KIND_LIST = Object.entries(DOC_KINDS).map(([key, v]) => ({ key, ...v }));

// Indian-flavored keyword dictionary for heuristic auto-suggestion.
// Match any keyword as a substring (case-insensitive) in the vendor field.
const KEYWORDS = {
  bill: [
    'electric', 'electricity', 'power', 'pgvcl', 'dgvcl', 'mgvcl', 'ugvcl', 'mseb',
    'adani electric', 'tata power', 'torrent power', 'bescom', 'tneb',
    'water', 'mahanagar gas', 'igl', 'gail', 'gas bill',
    'broadband', 'wifi', 'internet', 'jio fiber', 'airtel xstream', 'act fibernet',
    'phone bill', 'postpaid', 'vodafone', 'vi postpaid', 'bsnl', 'recharge',
    'rent', 'maintenance', 'society',
    'piped gas',
  ],
  invoice: [
    'invoice', 'tax invoice', 'gst invoice', 'b2b', 'proforma',
  ],
  loan: [
    'loan', 'emi', 'sanction', 'disbursement', 'mortgage',
    'home loan', 'auto loan', 'car loan', 'personal loan', 'gold loan',
    'hdfc loan', 'sbi loan', 'icici loan', 'axis loan', 'bajaj finance',
  ],
  warranty: [
    'warranty', 'guarantee', 'extended warranty', 'amc', 'service plan',
    'care+', 'protect+',
  ],
  receipt: [
    'dmart', 'big bazaar', 'reliance retail', 'reliance smart', 'reliance fresh',
    'amazon', 'flipkart', 'meesho', 'myntra', 'ajio',
    'croma', 'vijay sales', 'reliance digital',
    'zomato', 'swiggy', 'blinkit', 'zepto', 'instamart',
    'uber', 'ola', 'rapido', 'irctc',
  ],
};

// Returns a kind key (e.g. 'bill') if any keyword matches the vendor string, else null.
export function suggestKind(vendor) {
  if (!vendor || typeof vendor !== 'string') return null;
  const v = vendor.toLowerCase();
  for (const [kind, words] of Object.entries(KEYWORDS)) {
    for (const w of words) {
      if (v.includes(w)) return kind;
    }
  }
  return null;
}
