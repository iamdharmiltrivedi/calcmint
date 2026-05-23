// ── AIService — single entry point for every Claude call ──────────────
//
// Architecture: the React Native app NEVER talks to the Anthropic API
// directly. All calls go through our backend proxy at
// `${PROXY_URL}/api/ai`, which holds the actual ANTHROPIC_API_KEY and
// runs the prompt templates. The backend is responsible for picking
// the model (target: claude-sonnet-4-20250514) and the right max_tokens
// per call type (800 for stock, 400 for nudges, 1000 for chat).
//
// Why a proxy:
//  • API key cannot ship in the JS bundle (it would be extractable)
//  • central place to enforce server-side cost caps and abuse rules
//  • lets us swap models / prompt templates without an app release
//
// Client responsibilities:
//  • build a compact user context (under ~800 tokens) and ship it as
//    JSON in every call so Claude has personalised grounding
//  • enforce a soft daily call cap for free-tier users
//  • cache responses where it makes sense (nudge: 6 h)
//
// Failure model: every public method returns a Promise that resolves
// with a defensible fallback rather than throwing — UI screens stay
// usable when the backend is unreachable.

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import StorageService from './StorageService';
import { usePortfolioStore } from '../store/portfolioStore';
import { useMarketStore } from '../store/marketStore';
import { summarizeLoan, totalMonthlyObligation } from '../utils/loans';

// ── Configuration ─────────────────────────────────────────────────────
const DEFAULT_PROXY = 'https://aistocklens.com/api/ai';
const PROXY_OVERRIDE_KEY = '@ai_proxy_url';   // AsyncStorage — dev override
const AUTH_TOKEN_KEY     = 'ai_auth_token';   // SecureStore — bearer if logged in

const STORAGE = {
  USAGE: '@ai_usage',          // { date: 'YYYY-MM-DD', count: N }
  NUDGE: 'ai_nudge_cache',     // { ts, nudge }
  PRO:   '@ai_pro',            // 'true' | 'false'
};

export const DAILY_LIMIT_FREE = 5;
export const NUDGE_TTL_MS = 6 * 60 * 60 * 1000;

// Backend type tags. Keep these in sync with the proxy's switch.
const TYPE = {
  ANALYZE_STOCK:     'analyzeStock',
  FINANCE_INSIGHT:   'financeInsight',
  DASHBOARD_NUDGE:   'dashboardNudge',
  ANALYZE_PORTFOLIO: 'analyzePortfolio',
  CHAT:              'chat',
  GOAL_ADVICE:       'goalAdvice',
  GENERATE_NEWS:     'generateNews',
};

// Errors are tagged so screens can branch on intent (offline vs limit
// vs malformed) without parsing strings.
export class AIError extends Error {
  constructor(kind, message, extra = {}) {
    super(message);
    this.kind = kind;        // 'rate_limit' | 'network' | 'bad_response' | 'limit_reached'
    Object.assign(this, extra);
  }
}

// ── Storage helpers ────────────────────────────────────────────────────
const today = () => new Date().toISOString().slice(0, 10);

const readUsage = async () => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE.USAGE);
    const u = raw ? JSON.parse(raw) : null;
    if (!u || u.date !== today()) return { date: today(), count: 0 };
    return u;
  } catch {
    return { date: today(), count: 0 };
  }
};

const writeUsage = async (next) =>
  AsyncStorage.setItem(STORAGE.USAGE, JSON.stringify(next));

const incrementUsage = async () => {
  const cur = await readUsage();
  const next = { date: cur.date, count: cur.count + 1 };
  await writeUsage(next);
  return next;
};

export const isPro = async () => (await AsyncStorage.getItem(STORAGE.PRO)) === 'true';
export const setProTier = async (on) =>
  AsyncStorage.setItem(STORAGE.PRO, on ? 'true' : 'false');

export const getUsageInfo = async () => {
  if (await isPro()) return { count: 0, limit: Infinity, pro: true, remaining: Infinity };
  const u = await readUsage();
  return {
    count: u.count,
    limit: DAILY_LIMIT_FREE,
    remaining: Math.max(0, DAILY_LIMIT_FREE - u.count),
    pro: false,
  };
};

const getProxyUrl = async () => {
  try {
    const override = await AsyncStorage.getItem(PROXY_OVERRIDE_KEY);
    if (override && override.trim()) return override.trim();
  } catch {}
  return DEFAULT_PROXY;
};

export const setProxyUrlOverride = (url) =>
  AsyncStorage.setItem(PROXY_OVERRIDE_KEY, url);

// ── Core proxy call ────────────────────────────────────────────────────
// `cached: true` skips both the usage gate and the increment — useful
// when the caller already consumed cache (e.g. the 6 h nudge cache).
const callProxy = async (type, payload, { skipLimit = false } = {}) => {
  if (!skipLimit) {
    const info = await getUsageInfo();
    if (!info.pro && info.remaining <= 0) {
      throw new AIError('limit_reached', 'Daily AI limit reached', { usage: info });
    }
  }

  let authToken;
  try { authToken = await SecureStore.getItemAsync(AUTH_TOKEN_KEY); } catch {}

  const url = await getProxyUrl();
  try {
    const { data } = await axios.post(
      url,
      { type, payload },
      {
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        timeout: 25000,
      },
    );
    if (!skipLimit) await incrementUsage();
    return data;
  } catch (err) {
    if (err instanceof AIError) throw err;
    throw new AIError('network', err.message || 'Network error', { cause: err });
  }
};

// ── Context builder ────────────────────────────────────────────────────
// Compact JSON snapshot of the user. The whole object should comfortably
// fit under ~800 tokens — keep arrays bounded (top 3) and round numbers.
const CYCLE_MONTHS = { monthly: 1, quarterly: 3, yearly: 12 };

export const buildUserContext = async () => {
  const [expenses, goals, loans, subs, settings] = await Promise.all([
    StorageService.getExpenses(),
    StorageService.getGoals(),
    StorageService.getLoans(),
    StorageService.getSubscriptions(),
    StorageService.getSettings(),
  ]);

  const now = new Date();
  const monthBy = {};
  let monthSpend = 0;
  for (const e of expenses || []) {
    const d = new Date(e.date || e.createdAt);
    if (d.getFullYear() !== now.getFullYear() || d.getMonth() !== now.getMonth()) continue;
    const amt = parseFloat(e.amount || 0);
    monthSpend += amt;
    monthBy[e.categoryId] = (monthBy[e.categoryId] || 0) + amt;
  }
  const topCategories = Object.entries(monthBy)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id, amount]) => ({ id, amount: Math.round(amount) }));

  const activeLoans = (loans || []).filter((l) => !summarizeLoan(l).isClosed).length;
  const totalEMI    = totalMonthlyObligation(loans || []);
  const activeSubs  = (subs || []).reduce(
    (s, x) => s + (parseFloat(x.amount || 0) / (CYCLE_MONTHS[x.cycle] || 1)),
    0,
  );

  const monthlyIncome = parseFloat(settings?.monthlyIncome) || 0;
  const estimatedSurplus = monthlyIncome > 0
    ? Math.max(0, Math.round(monthlyIncome - monthSpend - totalEMI - activeSubs))
    : null;

  // Portfolio + watchlist from zustand singletons.
  const port    = usePortfolioStore.getState();
  const market  = useMarketStore.getState();
  const summary = port.getSummary();
  const metrics = port.getAllWithMetrics();
  const topHoldings = metrics
    .slice()
    .sort((a, b) => b.currentValue - a.currentValue)
    .slice(0, 3)
    .map((m) => ({
      symbol: m.holding.symbol,
      type:   m.holding.type,
      value:  Math.round(m.currentValue),
      plPct:  Number(m.profitLossPercent.toFixed(1)),
    }));

  const activeGoals = (goals || [])
    .filter((g) => (g.saved || 0) < (g.target || g.targetAmount || 0))
    .slice(0, 5)
    .map((g) => ({
      name:  g.name,
      pct:   Math.round(((g.saved || 0) / (g.target || g.targetAmount || 1)) * 100),
      years: g.years,
    }));

  return {
    finances: {
      monthSpend:       Math.round(monthSpend),
      topCategories,
      activeLoans,
      totalEMI:         Math.round(totalEMI),
      activeSubs:       Math.round(activeSubs),
      estimatedSurplus,
    },
    portfolio: {
      totalValue:     Math.round(summary.totalCurrent),
      todayPnL:       Math.round(summary.totalProfitLoss),
      todayPnLPct:    Number(summary.totalProfitLossPercent.toFixed(2)),
      topHoldings,
      watchlistCount: market.watchlist.length,
    },
    goals: activeGoals,
    userPreference: settings?.riskPreference || 'moderate',
  };
};

// ── Public methods ─────────────────────────────────────────────────────

// analyzeStock returns: { verdict, confidence, reasons[], risks[], targetPrice, timeHorizon }
// Verdict is one of 'BUY' | 'HOLD' | 'SELL'. Confidence is 0–100.
export const analyzeStock = async (symbol, fundamentals = {}, userContextOverride) => {
  const userContext = userContextOverride || await buildUserContext();
  try {
    const data = await callProxy(TYPE.ANALYZE_STOCK, { symbol, fundamentals, userContext });
    return normaliseStockAnalysis(data, symbol);
  } catch (err) {
    return offlineStockAnalysis(symbol, err);
  }
};

// getFinanceInsight returns: { insight, actionSuggestion, urgency }
export const getFinanceInsight = async (expenseData, loanData, portfolioData, goals) => {
  try {
    const data = await callProxy(TYPE.FINANCE_INSIGHT, {
      expenseData, loanData, portfolioData, goals,
    });
    return {
      insight: data?.insight || String(data || '').slice(0, 200),
      actionSuggestion: data?.actionSuggestion || null,
      urgency: data?.urgency || 'low',
    };
  } catch (err) {
    return {
      insight: 'Insight unavailable — reconnect to refresh.',
      actionSuggestion: null,
      urgency: 'low',
      offline: true,
    };
  }
};

// getDailyDashboardNudge returns a single string (max 80 chars).
// Cached for 6h. The cache lookup runs BEFORE the rate-limit gate so
// returning a cached nudge does not consume the user's daily quota.
export const getDailyDashboardNudge = async (monthExpenses, monthBudget, portfolioChange) => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE.NUDGE);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Date.now() - parsed.ts < NUDGE_TTL_MS && parsed.nudge) {
        return parsed.nudge;
      }
    }
  } catch {}

  try {
    const data = await callProxy(TYPE.DASHBOARD_NUDGE, {
      monthExpenses, monthBudget, portfolioChange,
    });
    const nudge = String(data?.nudge ?? data ?? '').replace(/^["']|["']$/g, '').slice(0, 80);
    if (nudge) {
      await AsyncStorage.setItem(STORAGE.NUDGE, JSON.stringify({ ts: Date.now(), nudge }));
    }
    return nudge || 'Tap to set this month’s spending intent.';
  } catch (err) {
    if (err.kind === 'limit_reached') return 'Daily AI limit reached — upgrade to Pro for unlimited insights.';
    return 'Live tip unavailable — connect to refresh.';
  }
};

export const clearNudgeCache = () => AsyncStorage.removeItem(STORAGE.NUDGE);

// analyzePortfolio returns: { rebalanceSuggestions[], riskLevel, healthScore }
export const analyzePortfolio = async (holdings, monthlyIncome, monthlyExpenses, goals) => {
  try {
    const data = await callProxy(TYPE.ANALYZE_PORTFOLIO, {
      holdings, monthlyIncome, monthlyExpenses, goals,
    });
    return {
      rebalanceSuggestions: Array.isArray(data?.rebalanceSuggestions) ? data.rebalanceSuggestions.slice(0, 5) : [],
      riskLevel:   data?.riskLevel || 'moderate',
      healthScore: Math.max(0, Math.min(100, Number(data?.healthScore) || 50)),
    };
  } catch {
    return { rebalanceSuggestions: [], riskLevel: 'moderate', healthScore: 50, offline: true };
  }
};

// chatMessage returns the assistant string. Last 10 messages of
// `conversationHistory` are sent; the rest are trimmed to save tokens.
export const chatMessage = async (userMessage, conversationHistory = [], fullContextOverride) => {
  const context = fullContextOverride || await buildUserContext();
  const history = (conversationHistory || []).slice(-10);
  try {
    const data = await callProxy(TYPE.CHAT, {
      userMessage, conversationHistory: history, context,
    });
    if (typeof data === 'string') return data;
    return data?.reply || data?.response || data?.message || '';
  } catch (err) {
    if (err.kind === 'limit_reached') {
      return 'You’ve hit today’s free AI limit. Upgrade to Pro to keep chatting — your conversation is saved.';
    }
    return 'I can’t reach the model right now. Try again once you’re back online.';
  }
};

// generateNewsForHolding returns an array of news items in the shape
//   { title, summary, source, sentiment: 'Positive'|'Neutral'|'Negative' }
// Up to 4 items. NewsService applies the ids/timestamps and persists.
// When the proxy is unreachable we return an empty array so the caller
// can fall back to local templates instead of showing a broken state.
export const generateNewsForHolding = async (holding) => {
  try {
    const data = await callProxy(TYPE.GENERATE_NEWS, {
      symbol:   holding.symbol,
      name:     holding.name,
      type:     holding.type,
      exchange: holding.exchange,
    });
    const items = Array.isArray(data) ? data : (data?.items || []);
    return items
      .filter((n) => n && (n.title || n.summary))
      .slice(0, 4)
      .map((n) => ({
        title:     String(n.title || '').slice(0, 200),
        summary:   String(n.summary || '').slice(0, 280),
        source:    String(n.source || '').slice(0, 60),
        sentiment: ['Positive', 'Neutral', 'Negative'].includes(n.sentiment) ? n.sentiment : 'Neutral',
      }));
  } catch {
    return [];
  }
};

// getGoalAdvice returns: { onTrack, suggestion, monthlyNeeded }
export const getGoalAdvice = async (goal, currentSavings, monthlyExpenses, portfolio) => {
  try {
    const data = await callProxy(TYPE.GOAL_ADVICE, {
      goal, currentSavings, monthlyExpenses, portfolio,
    });
    return {
      onTrack: Boolean(data?.onTrack),
      suggestion: data?.suggestion || '',
      monthlyNeeded: Math.max(0, Number(data?.monthlyNeeded) || 0),
    };
  } catch {
    return { onTrack: false, suggestion: 'Goal advice is offline.', monthlyNeeded: 0, offline: true };
  }
};

// ── Local normalisers / fallbacks ─────────────────────────────────────
const normaliseStockAnalysis = (data, symbol) => {
  const verdict = ['BUY', 'HOLD', 'SELL'].includes(data?.verdict) ? data.verdict : 'HOLD';
  const confidence = Math.max(0, Math.min(100, Number(data?.confidence) || 50));
  const reasons = Array.isArray(data?.reasons) ? data.reasons.slice(0, 3).map((r) => String(r).slice(0, 200)) : [];
  const risks   = Array.isArray(data?.risks)   ? data.risks.slice(0, 2).map((r) => String(r).slice(0, 200)) : [];
  const targetPrice = data?.targetPrice != null ? Number(data.targetPrice) : null;
  const timeHorizon = data?.timeHorizon || '6-12 months';
  return { symbol, verdict, confidence, reasons, risks, targetPrice, timeHorizon };
};

const offlineStockAnalysis = (symbol, err) => ({
  symbol,
  verdict: 'HOLD',
  confidence: 50,
  reasons: ['Backend unreachable — showing neutral default.'],
  risks: [],
  targetPrice: null,
  timeHorizon: '—',
  offline: true,
  errorKind: err?.kind || 'unknown',
});

// Default export for screens that prefer namespace imports.
export default {
  analyzeStock,
  getFinanceInsight,
  getDailyDashboardNudge,
  clearNudgeCache,
  analyzePortfolio,
  chatMessage,
  getGoalAdvice,
  generateNewsForHolding,
  buildUserContext,
  getUsageInfo,
  isPro,
  setProTier,
  setProxyUrlOverride,
  DAILY_LIMIT_FREE,
  NUDGE_TTL_MS,
  AIError,
};
