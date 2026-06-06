// Patches React Native's <Text> / <TextInput> so any string in the app
// renders in Inter by default — no need to touch every existing screen.
// Numeric / financial values that need JetBrains Mono are wrapped in
// AppNumber / CurrencyText / MONO_STYLE, which override fontFamily.
//
// This runs once, synchronously, from App.js after fonts have loaded.
import { Text, TextInput } from 'react-native';
import { FONT_FAMILIES } from './fonts';

let applied = false;

export function setupDefaultFont() {
  if (applied) return;
  applied = true;

  const merge = (Component) => {
    const existing = Component.defaultProps || {};
    Component.defaultProps = {
      ...existing,
      // Keep platform behaviour (e.g. iOS Dynamic Type), just override
      // the family. We DON'T set weight — components that need bold
      // should pass fontFamily: Inter_700Bold themselves.
      allowFontScaling: existing.allowFontScaling ?? true,
      maxFontSizeMultiplier: existing.maxFontSizeMultiplier ?? 1.4,
      style: [{ fontFamily: FONT_FAMILIES.interRegular }, existing.style],
    };
  };

  merge(Text);
  merge(TextInput);
}
