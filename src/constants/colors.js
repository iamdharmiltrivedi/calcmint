import { Platform } from 'react-native';

// ── Design tokens — Finance Calculator Redesign (offline-first) ──────────────
export const COLORS = {
  // Surfaces
  background: '#F7F4ED',     // cream
  card:       '#FFFFFF',
  surface:    '#FBF9F4',
  border:     'rgba(14,26,20,0.07)',  // hairline
  divider:    'rgba(14,26,20,0.07)',

  // Ink
  text:    '#0E1A14',  // ink
  text2:   '#27332C',
  subtext: '#6B7B72',  // muted
  faint:   '#9BA8A1',

  // Brand
  primary:      '#0B5D3B',  // emerald
  primaryDeep:  '#073A26',
  primarySoft:  '#E8F1EC',
  gold:         '#C9A24A',
  goldSoft:     '#F4ECD8',

  // Semantic
  success: '#218A52',
  warning: '#D97A3A',
  error:   '#C44A6A',

  // Legacy aliases (kept so other files still resolve)
  secondary: '#218A52',
  accent:    '#C9A24A',

  // Gradients
  gradient:        ['#0E7345', '#0B5D3B', '#073A26'],
  gradientDark:    ['#2A1F4D', '#1C1430'],
  gradientGold:    ['#B8881A', '#8E6610'],

  shadow: Platform.select({
    ios: {
      shadowColor: '#0E1A14',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.08,
      shadowRadius: 18,
    },
    android: { elevation: 3 },
  }),
  shadowSoft: Platform.select({
    ios: {
      shadowColor: '#0E1A14',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 8,
    },
    android: { elevation: 1 },
  }),
};

// Category accents — one swatch per calculator (from the design system board)
export const CATEGORY = {
  blue:   { c: '#2E5BFF', soft: '#E7EDFE' },
  violet: { c: '#6F4FE0', soft: '#EFE9FC' },
  green:  { c: '#218A52', soft: '#DDEFE3' },
  clay:   { c: '#C5562A', soft: '#FADFD0' },
  teal:   { c: '#0F8C8B', soft: '#E2F1F1' },
  brown:  { c: '#7C5C44', soft: '#EFE6DD' },
  indigo: { c: '#1F4FA8', soft: '#E1E9F6' },
  rose:   { c: '#C44A6A', soft: '#F8E3E9' },
  amber:  { c: '#B8881A', soft: '#F7EBCC' },
  orange: { c: '#D97A3A', soft: '#FAEADC' },
};

// Typography — degrades to system fonts; replace if expo-font is added later.
export const FONTS = Platform.select({
  ios: {
    sans:  'System',
    mono:  'Menlo',
  },
  android: {
    sans:  'sans-serif',
    mono:  'monospace',
  },
});

export const MONO_STYLE = {
  fontFamily: FONTS.mono,
  fontVariant: ['tabular-nums'],
};
