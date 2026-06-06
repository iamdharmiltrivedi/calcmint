import React from 'react';
import AppText from './AppText';

/**
 * Top-of-screen H1. Always 28 Inter Bold with tight tracking — matches the
 * iOS large-title and Material 3 expressive-headline cadence.
 *
 * @param {object} props
 * @param {React.ReactNode} props.children
 * @param {object} [props.style]
 * @param {string} [props.color]
 */
export default function ScreenTitle({ children, style, color, ...rest }) {
  return (
    <AppText
      variant="screenTitle"
      color={color}
      style={style}
      accessibilityRole="header"
      {...rest}
    >
      {children}
    </AppText>
  );
}
