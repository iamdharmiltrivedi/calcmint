// Indian number formatting: 1,00,000 system
// Shows Lakh / Crore abbreviations for readability
export const formatINR = (amount) => {
  if (amount === null || amount === undefined || isNaN(amount)) return '₹0';
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';

  if (abs >= 10_000_000) {
    // 1 Crore+
    const cr = abs / 10_000_000;
    return `${sign}₹${cr % 1 === 0 ? cr.toFixed(0) : cr.toFixed(2)} Cr`;
  }
  if (abs >= 100_000) {
    // 1 Lakh+
    const lakh = abs / 100_000;
    return `${sign}₹${lakh % 1 === 0 ? lakh.toFixed(0) : lakh.toFixed(2)} L`;
  }
  if (abs >= 1_000) {
    const k = abs / 1_000;
    return `${sign}₹${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}K`;
  }
  return `${sign}₹${Math.round(abs)}`;
};

// Full Indian format with commas: 1,50,000
export const formatINRFull = (amount) => {
  if (amount === null || amount === undefined || isNaN(amount)) return '₹0';
  return '₹' + Math.round(amount).toLocaleString('en-IN');
};

export const formatPercent = (value) =>
  `${parseFloat(value || 0).toFixed(2)}%`;

// 14 months → "1 yr 2 mo", 24 months → "2 yrs"
export const formatMonths = (months) => {
  if (!months) return '0 mo';
  if (months < 12) return `${months} mo`;
  const yrs = Math.floor(months / 12);
  const mo = months % 12;
  const yrLabel = `${yrs} yr${yrs > 1 ? 's' : ''}`;
  return mo > 0 ? `${yrLabel} ${mo} mo` : yrLabel;
};

export const formatYears = (years) =>
  `${years} yr${years > 1 ? 's' : ''}`;

// Compact number for chart axis labels
export const formatCompact = (n) => {
  if (!n) return '0';
  if (n >= 10_000_000) return `${(n / 10_000_000).toFixed(1)}Cr`;
  if (n >= 100_000) return `${(n / 100_000).toFixed(1)}L`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return `${Math.round(n)}`;
};
