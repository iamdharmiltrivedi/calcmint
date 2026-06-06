import { Platform } from 'react-native';
import { FONT_FAMILIES } from '../theme/fonts';

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

  // Markets / P&L semantic (used by ported Stock Lens screens)
  positive: '#0B5D3B',          // emerald — positive values + buy
  positiveSoft: '#E8F1EC',
  negative: '#E24B4A',          // red — negative values + sell
  negativeSoft: '#FCE7E6',
  buy:  '#0B5D3B',
  hold: '#EF9F27',              // amber — hold, warning, neutral trend
  holdSoft: '#FDF1DA',
  sell: '#E24B4A',
  sentimentPositive: '#0B5D3B',
  sentimentNeutral:  '#6B7B72',
  sentimentNegative: '#E24B4A',

  // Hairline (0.5px) border for cards per spec
  hairline: '#E5E5E0',

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

// Typography — Inter only. Numeric values get weight (SemiBold / Bold)
// for emphasis, matching Indian fintech apps (INDmoney, Groww, Upstox,
// Zerodha, Angel One). The actual token definitions live in
// src/theme/typography.js; this file exposes the weight aliases so
// legacy inline styles keep resolving without a per-screen rewrite.
//
// Convention: `fontFamily` carries the weight (Inter_700Bold etc.).
// The React Native `fontWeight` prop is redundant but kept on legacy
// styles so nothing visually shifts if we missed a swap.
export const FONTS = {
  sans:         FONT_FAMILIES.interRegular,
  sansMedium:   FONT_FAMILIES.interMedium,
  sansSemiBold: FONT_FAMILIES.interSemiBold,
  sansBold:     FONT_FAMILIES.interBold,

  // Legacy aliases — these once pointed at JetBrains Mono. Re-targeted
  // to Inter weights so MONO_STYLE / FONTS.mono call sites still render
  // the right thing. New code should ignore them and use AppNumber.
  mono:         FONT_FAMILIES.interSemiBold,
  monoMedium:   FONT_FAMILIES.interMedium,
  monoSemiBold: FONT_FAMILIES.interSemiBold,
  monoBold:     FONT_FAMILIES.interBold,
};

// Numeric / financial values used to be set via MONO_STYLE. We keep the
// export name (it's referenced in ~20 legacy screens) but it now resolves
// to Inter SemiBold with tabular-nums for column alignment.
export const MONO_STYLE = {
  fontFamily:  FONTS.sansSemiBold,
  fontVariant: ['tabular-nums'],
};

// Drop-in for text labels — same family as the global default, exported
// for stylesheets that prefer composition over relying on Text defaults.
export const SANS_STYLE = {
  fontFamily: FONTS.sans,
};

// ── Type scale per redesign spec ───────────────────────────────────────
// Legacy alias kept for screens that already import TYPE.*. New code
// should pull tokens from `src/theme/typography.js` (TYPOGRAPHY.*) or use
// the AppText / SectionTitle / ScreenTitle components.
export const TYPE = {
  headline: { fontFamily: FONTS.sansBold,     fontSize: 24, letterSpacing: -0.4, color: COLORS.text },
  body:     { fontFamily: FONTS.sansSemiBold, fontSize: 16, color: COLORS.text },
  label:    { fontFamily: FONTS.sansSemiBold, fontSize: 13, color: COLORS.text },
  caption:  { fontFamily: FONTS.sansMedium,   fontSize: 11, color: COLORS.subtext },
  // 11px uppercase section header — letter-spacing 0.06em ≈ 0.66px
  section:  { fontFamily: FONTS.sansBold,     fontSize: 11, letterSpacing: 0.66, color: '#888888', textTransform: 'uppercase' },
};

// ── Card token per spec: white, 12px radius, 0.5px hairline, 16px pad ─
export const CARD = {
  backgroundColor: COLORS.card,
  borderRadius: 12,
  borderWidth: 0.5,
  borderColor: COLORS.hairline,
  padding: 16,
};
