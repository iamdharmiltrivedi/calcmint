// Thin shim over the unified AIService for Markets-tab consumers.
// Historically this module called HuggingFace directly; we now route
// every call through AIService → backend proxy → Claude. Public API
// shapes are preserved so portfolioStore + marketStore + screens
// don't need to change.
//
// Local SL_AI cache (sl_ai_cache) is still consulted first so we keep
// the cheap-stale-on-revisit behaviour and don't burn rate-limit
// quota on identical analyses.
import { SL_TTL } from '../../constants/storageKeys';
import { getCachedAnalysis, upsertAnalysis } from './MarketsDB';
import AIService from '../AIService';

// analyseHolding → { symbol, recommendation, sentiment, confidence, summary, analyzedAt }
// Shape match preserved for portfolioStore.setAnalysis() + screens.
export const analyseHolding = async ({ holding, currentPrice }, opts = {}) => {
  const { force = false } = opts;
  const cached = await getCachedAnalysis(holding.symbol);
  if (!force && cached && Date.now() - cached.analyzedAt < SL_TTL.AI_ANALYSIS) {
    return cached;
  }

  const fundamentals = {
    type:      holding.type,
    exchange:  holding.exchange,
    buyPrice:  holding.buyPrice,
    quantity:  holding.quantity,
    currentPrice: currentPrice ?? null,
  };

  const result = await AIService.analyzeStock(holding.symbol, fundamentals);
  const analysis = {
    symbol:         holding.symbol,
    recommendation: result.verdict,                                     // BUY|HOLD|SELL
    sentiment:      verdictToSentiment(result.verdict),
    confidence:     result.confidence,
    // Concatenate reasons into a single short summary for the existing
    // UI (StockDetail collapsible) — the structured fields are still
    // available via AIService.analyzeStock if a screen wants them.
    summary:        composeSummary(result),
    targetPrice:    result.targetPrice,
    timeHorizon:    result.timeHorizon,
    reasons:        result.reasons,
    risks:          result.risks,
    analyzedAt:     Date.now(),
    offline:        result.offline === true,
  };
  await upsertAnalysis(analysis);
  return analysis;
};

// One-line dashboard tip — delegates to AIService.getDailyDashboardNudge.
// The 6-hour cache lives inside AIService so this call is free if a
// fresh nudge already exists.
export const generateDashboardInsight = async ({
  monthSpend, monthlyEMI, monthSubs,
  portfolioValue, portfolioPL, holdingsCount,
}) => {
  return AIService.getDailyDashboardNudge(
    { monthSpend, monthlyEMI, monthSubs },
    null,
    { value: portfolioValue, pl: portfolioPL, holdings: holdingsCount },
  );
};

// Rebalancing advice for the Portfolio screen.
export const generateRebalanceAdvice = async (holdingsWithMetrics) => {
  if (!holdingsWithMetrics.length) return null;
  const holdings = holdingsWithMetrics.map((h) => ({
    symbol: h.holding.symbol,
    type:   h.holding.type,
    value:  Math.round(h.currentValue),
    plPct:  Number(h.profitLossPercent.toFixed(1)),
  }));
  const result = await AIService.analyzePortfolio(holdings, null, null, null);
  if (!result || (!result.rebalanceSuggestions?.length && !result.healthScore)) return null;
  const tip = result.rebalanceSuggestions[0];
  if (tip) return typeof tip === 'string' ? tip : (tip.text || tip.message || '');
  return `Risk: ${result.riskLevel}. Health score ${result.healthScore}/100.`;
};

// ── Helpers ────────────────────────────────────────────────────────────
const verdictToSentiment = (v) =>
  v === 'BUY' ? 'Positive' : v === 'SELL' ? 'Negative' : 'Neutral';

const composeSummary = (result) => {
  if (!result.reasons?.length) {
    return result.offline
      ? 'AI offline — showing neutral default.'
      : `${result.verdict} with ${result.confidence}% confidence.`;
  }
  return result.reasons.slice(0, 2).join(' · ').slice(0, 200);
};
