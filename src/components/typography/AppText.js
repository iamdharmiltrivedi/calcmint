import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { TEXT_VARIANTS } from '../../theme/typography';
import { COLORS } from '../../constants/colors';

/**
 * Semantic text component. Pass a `variant` to pick a typography token
 * (defined in src/theme/typography.js). Forwards every other prop to the
 * underlying RN <Text> so callers can still override colour, numberOfLines,
 * onPress, accessibility props, etc.
 *
 * @typedef {keyof typeof TEXT_VARIANTS} TextVariant
 *
 * @param {object} props
 * @param {TextVariant} [props.variant='body']
 * @param {string} [props.color]            CSS colour. Defaults to COLORS.text.
 * @param {object} [props.style]            Additional style overrides (highest precedence).
 * @param {boolean} [props.allowFontScaling=true]
 * @param {React.ReactNode} props.children
 */
export default function AppText({
  variant = 'body',
  color,
  style,
  allowFontScaling = true,
  children,
  ...rest
}) {
  const token = TEXT_VARIANTS[variant] || TEXT_VARIANTS.body;
  return (
    <Text
      allowFontScaling={allowFontScaling}
      maxFontSizeMultiplier={1.4}
      style={[styles.base, token, color ? { color } : null, style]}
      {...rest}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: { color: COLORS.text },
});
