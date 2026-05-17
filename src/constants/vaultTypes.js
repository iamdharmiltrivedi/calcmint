// Vault entry type schemas. `sensitive: true` fields are masked by default
// in the list and detail views, and revealed on tap-and-hold.
export const VAULT_TYPES = {
  pan: {
    label: 'PAN',
    icon: 'card-outline',
    color: '#2E5BFF',
    soft: '#E7EDFE',
    titleField: 'name',
    fields: [
      { key: 'name', label: 'Name on card' },
      { key: 'pan', label: 'PAN number', sensitive: true, max: 10, autoCap: 'characters' },
    ],
  },
  aadhaar: {
    label: 'Aadhaar',
    icon: 'finger-print-outline',
    color: '#6F4FE0',
    soft: '#EFE9FC',
    warning: 'Store only the last 4 digits. Never store the full Aadhaar number.',
    titleField: 'name',
    fields: [
      { key: 'name', label: 'Name on card' },
      { key: 'last4', label: 'Last 4 digits', sensitive: true, max: 4, keyboard: 'numeric' },
    ],
  },
  insurance: {
    label: 'Insurance',
    icon: 'shield-outline',
    color: '#218A52',
    soft: '#DDEFE3',
    titleField: 'insurer',
    fields: [
      { key: 'insurer', label: 'Insurer' },
      { key: 'policyNo', label: 'Policy number', sensitive: true },
      { key: 'premium', label: 'Annual premium', keyboard: 'numeric' },
      { key: 'expiry', label: 'Expiry (DD/MM/YYYY)' },
    ],
  },
  vehicle: {
    label: 'Vehicle insurance',
    icon: 'car-outline',
    color: '#C5562A',
    soft: '#FADFD0',
    titleField: 'vehicleNo',
    fields: [
      { key: 'vehicleNo', label: 'Vehicle number', autoCap: 'characters' },
      { key: 'insurer', label: 'Insurer' },
      { key: 'policyNo', label: 'Policy number', sensitive: true },
      { key: 'expiry', label: 'Expiry (DD/MM/YYYY)' },
    ],
  },
  fd: {
    label: 'Fixed Deposit',
    icon: 'business-outline',
    color: '#0F8C8B',
    soft: '#E2F1F1',
    titleField: 'bank',
    fields: [
      { key: 'bank', label: 'Bank / institution' },
      { key: 'fdNo', label: 'FD receipt number', sensitive: true },
      { key: 'principal', label: 'Principal', keyboard: 'numeric' },
      { key: 'rate', label: 'Interest rate (%)', keyboard: 'numeric' },
      { key: 'maturity', label: 'Maturity date (DD/MM/YYYY)' },
    ],
  },
  sip: {
    label: 'SIP / Mutual Fund',
    icon: 'trending-up-outline',
    color: '#B8881A',
    soft: '#F7EBCC',
    titleField: 'fund',
    fields: [
      { key: 'fund', label: 'Scheme name' },
      { key: 'amc', label: 'Fund house (AMC)' },
      { key: 'folio', label: 'Folio number', sensitive: true },
      { key: 'sip', label: 'Monthly SIP', keyboard: 'numeric' },
    ],
  },
  note: {
    label: 'Secure note',
    icon: 'document-text-outline',
    color: '#7C5C44',
    soft: '#EFE6DD',
    titleField: 'title',
    fields: [
      { key: 'title', label: 'Title' },
      { key: 'body', label: 'Note', sensitive: true, multiline: true },
    ],
  },
};

export const VAULT_TYPE_LIST = Object.entries(VAULT_TYPES).map(([key, v]) => ({ key, ...v }));
