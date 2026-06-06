// Semantic typography tokens — Inter-only, modelled on INDmoney / Groww /
// Upstox / Zerodha / Angel One. Strong numeric emphasis comes from weight
// (SemiBold / Bold) and size — not from a contrasting monospace family.
//
// Use these tokens via the typography components instead of inline
// `fontSize` / `fontWeight` / `fontFamily`. Component → variant:
//
//   <AppText variant="screenTitle">    →  TYPOGRAPHY.screenTitle
//   <AppNumber size="portfolio">       →  NUMERIC_VARIANTS.portfolio
//   <CurrencyText size="hero">         →  NUMERIC_VARIANTS.hero
//
// Line-height ratios:
//   - Hero / display:    1.05  (tight, headline pop)
//   - Headlines:         1.2
//   - Body:              1.5   (comfortable reading)
//   - Micro / caption:   1.4
//
// Letter-spacing tightens with size, opens at small sizes — the Apple /
// Google pattern.
import { FONT_FAMILIES } from './fonts';

const lh = (size, ratio) => Math.round(size * ratio);

// ── UI text ──────────────────────────────────────────────────────────────
export const TYPOGRAPHY = {
  // Hero: full-screen result values (calculator outputs, "you saved ₹X").
  heroValue: {
    fontFamily:    FONT_FAMILIES.interBold,
    fontSize:      48,
    lineHeight:    lh(48, 1.05),
    letterSpacing: -1.2,
  },
  // Portfolio total — the single biggest number on the home / portfolio.
  portfolioValue: {
    fontFamily:    FONT_FAMILIES.interBold,
    fontSize:      40,
    lineHeight:    lh(40, 1.05),
    letterSpacing: -1.0,
  },

  // Screen heading (H1).
  screenTitle: {
    fontFamily:    FONT_FAMILIES.interBold,
    fontSize:      34,
    lineHeight:    lh(34, 1.15),
    letterSpacing: -0.6,
  },
  // Section heading (H2) — "Watchlist", "Top movers".
  sectionTitle: {
    fontFamily:    FONT_FAMILIES.interBold,
    fontSize:      28,
    lineHeight:    lh(28, 1.2),
    letterSpacing: -0.4,
  },
  // Card / sheet heading.
  cardTitle: {
    fontFamily:    FONT_FAMILIES.interSemiBold,
    fontSize:      20,
    lineHeight:    lh(20, 1.25),
    letterSpacing: -0.2,
  },

  // Body content.
  primaryBody: {
    fontFamily:    FONT_FAMILIES.interRegular,
    fontSize:      16,
    lineHeight:    lh(16, 1.5),
    letterSpacing: 0,
  },
  secondaryBody: {
    fontFamily:    FONT_FAMILIES.interRegular,
    fontSize:      14,
    lineHeight:    lh(14, 1.45),
    letterSpacing: 0,
  },
  caption: {
    fontFamily:    FONT_FAMILIES.interRegular,
    fontSize:      12,
    lineHeight:    lh(12, 1.4),
    letterSpacing: 0.1,
  },

  // Controls.
  button: {
    fontFamily:    FONT_FAMILIES.interSemiBold,
    fontSize:      16,
    lineHeight:    lh(16, 1.25),
    letterSpacing: 0.1,
  },
  tabText: {
    fontFamily:    FONT_FAMILIES.interMedium,
    fontSize:      15,
    lineHeight:    lh(15, 1.3),
    letterSpacing: 0.1,
  },
  smallLabel: {
    fontFamily:    FONT_FAMILIES.interMedium,
    fontSize:      13,
    lineHeight:    lh(13, 1.35),
    letterSpacing: 0.15,
  },
};

// Back-compat aliases — earlier components consumed these variant names.
// New code should prefer the canonical names above.
TYPOGRAPHY.body       = TYPOGRAPHY.primaryBody;
TYPOGRAPHY.bodyLarge  = TYPOGRAPHY.primaryBody;
TYPOGRAPHY.bodySmall  = TYPOGRAPHY.secondaryBody;
TYPOGRAPHY.label      = TYPOGRAPHY.smallLabel;
TYPOGRAPHY.tabLabel   = TYPOGRAPHY.tabText;
TYPOGRAPHY.display    = TYPOGRAPHY.heroValue;
TYPOGRAPHY.displayLarge = TYPOGRAPHY.heroValue;

// ── Numeric variants ─────────────────────────────────────────────────────
// All Inter, weights SemiBold / Bold. Use AppNumber / CurrencyText to
// render financial data so the right token + tabular-nums get applied.
//
//   hero       → full-screen result (48 Bold) — calculator outputs
//   portfolio  → portfolio total (40 Bold)    — home / portfolio hero
//   large      → returns, big P&L (24 Bold)   — "+₹34,567"
//   medium     → stock price (18 SemiBold)    — list row primary value
//   small      → inline price / % (14 SemiBold) — "₹23,405.70", "+12.45%"
export const NUMERIC_VARIANTS = {
  hero: {
    fontFamily:    FONT_FAMILIES.interBold,
    fontSize:      48,
    lineHeight:    lh(48, 1.05),
    letterSpacing: -1.2,
  },
  portfolio: {
    fontFamily:    FONT_FAMILIES.interBold,
    fontSize:      40,
    lineHeight:    lh(40, 1.05),
    letterSpacing: -1.0,
  },
  large: {
    fontFamily:    FONT_FAMILIES.interBold,
    fontSize:      24,
    lineHeight:    lh(24, 1.2),
    letterSpacing: -0.3,
  },
  medium: {
    fontFamily:    FONT_FAMILIES.interSemiBold,
    fontSize:      18,
    lineHeight:    lh(18, 1.3),
    letterSpacing: -0.2,
  },
  small: {
    fontFamily:    FONT_FAMILIES.interSemiBold,
    fontSize:      14,
    lineHeight:    lh(14, 1.4),
    letterSpacing: 0,
  },
};

// Spacing tokens that pair with the type scale for vertical rhythm.
export const SPACING = {
  xxs: 4,
  xs:  6,
  sm:  8,
  md:  12,
  lg:  16,
  xl:  20,
  xxl: 28,
  sectionGap:   28,  // between sections
  headingGap:   12,  // heading → first paragraph
  paragraphGap: 8,   // paragraph → paragraph
  cardGap:      8,   // list-item card spacing
};

// `AppText` variant lookup. Identity-export so legacy callers keep
// resolving against the same object.
export const TEXT_VARIANTS = TYPOGRAPHY;
