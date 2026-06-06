import React from 'react';
import AppNumber from './AppNumber';
import { formatINR, formatINRFull } from '../../utils/formatters';

/**
 * Currency-aware number. Pass `value` (a number) and the component formats
 * it via the project's Indian number formatter (1,50,000 with Lakh / Crore
 * abbreviations) and renders it in Inter SemiBold / Bold (size dependent).
 *
 * Use `format="full"` for `₹1,50,000` style; default `"compact"` for the
 * abbreviated ₹1.5L / ₹1.2 Cr style used in hero / list cards.
 *
 * Optional `signed`: prefixes a `+` for positive numbers (and uses '−' for
 * negatives so the typography looks balanced — minus sign not hyphen).
 *
 * @param {object} props
 * @param {number} props.value
 * @param {'compact'|'full'} [props.format='compact']
 * @param {'hero'|'portfolio'|'large'|'medium'|'small'} [props.size='medium']
 * @param {boolean} [props.signed=false]
 * @param {string} [props.color]
 * @param {object} [props.style]
 */
export default function CurrencyText({
  value,
  format = 'compact',
  size = 'medium',
  signed = false,
  ...rest
}) {
  const n = typeof value === 'number' ? value : Number(value) || 0;
  const formatter = format === 'full' ? formatINRFull : formatINR;
  let text = formatter(Math.abs(n));
  if (signed) {
    text = (n > 0 ? '+' : n < 0 ? '−' : '') + text;
  } else if (n < 0) {
    text = '−' + text;
  }
  return <AppNumber size={size} {...rest}>{text}</AppNumber>;
}
