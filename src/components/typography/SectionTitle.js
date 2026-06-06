import React from 'react';
import AppText from './AppText';

/**
 * Section heading used inside a screen — e.g. "Top movers", "Related news".
 * Defaults to `sectionTitle` (22 / Inter SemiBold). For more prominent
 * group headings use `<ScreenTitle>` instead.
 *
 * @param {object} props
 * @param {React.ReactNode} props.children
 * @param {object} [props.style]
 * @param {string} [props.color]
 */
export default function SectionTitle({ children, style, color, ...rest }) {
  return (
    <AppText variant="sectionTitle" color={color} style={style} {...rest}>
      {children}
    </AppText>
  );
}
