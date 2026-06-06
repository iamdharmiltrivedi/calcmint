import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { NUMERIC_VARIANTS } from '../../theme/typography';
import { COLORS } from '../../constants/colors';

/**
 * Renders numeric / financial values in Inter (SemiBold or Bold depending
 * on size) with tabular figures. Use this for raw numbers (counts, ratios,
 * scores, percentages). For currency, prefer <CurrencyText> which adds
 * INR formatting on top.
 *
 * Size → weight mapping (matches INDmoney / Groww style):
 *   hero      → Inter Bold 48      — full-screen calculator results
 *   portfolio → Inter Bold 40      — portfolio total on home / portfolio
 *   large     → Inter Bold 24      — returns ("+₹34,567")
 *   medium    → Inter SemiBold 18  — stock price in a list row
 *   small     → Inter SemiBold 14  — inline price / percentage
 *
 * @typedef {'hero'|'portfolio'|'large'|'medium'|'small'} NumericSize
 *
 * @param {object} props
 * @param {NumericSize} [props.size='medium']
 * @param {string} [props.color]
 * @param {object} [props.style]
 * @param {number|string|React.ReactNode} props.children
 */
export default function AppNumber({
  size = 'medium',
  color,
  style,
  children,
  ...rest
}) {
  const token = NUMERIC_VARIANTS[size] || NUMERIC_VARIANTS.medium;
  return (
    <Text
      maxFontSizeMultiplier={1.3}
      style={[styles.base, token, color ? { color } : null, style]}
      {...rest}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    color: COLORS.text,
    // Inter ships a 'tnum' OpenType feature — enabling it keeps digits
    // column-aligned in lists and tables without switching to a
    // monospace face.
    fontVariant: ['tabular-nums'],
  },
});
