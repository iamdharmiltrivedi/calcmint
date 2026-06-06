// ── AIService — direct HuggingFace inference for every AI call ────────
//
// Architecture: the React Native app calls HuggingFace's OpenAI-compatible
// router endpoint directly with an API key shipped in the JS bundle. The
// key is read from `process.env.EXPO_PUBLIC_HUGGING_FACE_API_KEY` (only
// vars prefixed `EXPO_PUBLIC_` are exposed to the bundle).
//
// Trade-off vs. the previous backend proxy:
//   + works offline-of-our-infra — no server to keep alive
//   - the HF key is extractable from the APK (rotate-able, low-risk on
//     free tier, but treat as sensitive)
//
// Each public method builds a prompt + system instruction, calls the
// chat-completions endpoint, and parses the model's JSON reply. Shapes
// returned to callers match the old proxy contract exactly so stores /
// screens don't need to change.
//
// Failure model: every public method returns a Promise that resolves
// with a defensible fallback rather than throwing — UI screens stay
// usable when HF is unreachable or rate-limited.

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import StorageService from './StorageService';
import { usePortfolioStore } from '../store/portfolioStore';
import { useMarketStore } from '../store/marketStore';
import { summarizeLoan, totalMonthlyObligation } from '../utils/loans';

// ── Configuration ─────────────────────────────────────────────────────
const HF_ENDPOINT = 'https://router.huggingface.co/v1/chat/completions';
// Override via .env: EXPO_PUBLIC_HUGGING_FACE_MODEL=<provider-qualified>
// The default below uses the Novita provider for Llama 3.1 8B — a free
// tier on the HF router for most accounts. If your account doesn't have
// access (you'll see a 401/403/404 in the Metro logs), pick another
// model your account is provisioned for from
// https://huggingface.co/models?inference_provider=all&pipeline_tag=text-generation
const HF_MODEL = (process.env.EXPO_PUBLIC_HUGGING_FACE_MODEL || 'meta-llama/Llama-3.1-8B-Instruct:novita').trim();

const STORAGE = {
  USAGE: '@ai_usage',          // { date: 'YYYY-MM-DD', count: N }
  NUDGE: 'ai_nudge_cache',     // { ts, nudge }
  PRO:   '@ai_pro',            // 'true' | 'false'
};

export const DAILY_LIMIT_FREE = 30;
export const NUDGE_TTL_MS = 6 * 60 * 60 * 1000;

// Errors are tagged so screens can branch on intent (offline vs limit
// vs malformed) without parsing strings.
export class AIError extends Error {
  constructor(kind, message, extra = {}) {
    super(message);
    this.kind = kind;        // 'rate_limit' | 'network' | 'bad_response' | 'limit_reached' | 'config'
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

// ── HuggingFace client ────────────────────────────────────────────────
const getApiKey = () => {
  const k = process.env.EXPO_PUBLIC_HUGGING_FACE_API_KEY;
  return typeof k === 'string' && k.trim() ? k.trim() : null;
};

// Single chat-completions call. `messages` follows the OpenAI shape.
// Returns the assistant message string (raw — caller parses JSON if needed).
const callHuggingFace = async (messages, { maxTokens = 800, temperature = 0.3, skipLimit = false } = {}) => {
  if (!skipLimit) {
    const info = await getUsageInfo();
    if (!info.pro && info.remaining <= 0) {
      throw new AIError('limit_reached', 'Daily AI limit reached', { usage: info });
    }
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    throw new AIError('config', 'HuggingFace API key missing — set EXPO_PUBLIC_HUGGING_FACE_API_KEY');
  }

  try {
    const { data } = await axios.post(
      HF_ENDPOINT,
      {
        model: HF_MODEL,
        messages,
        max_tokens: maxTokens,
        temperature,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 25000,
      },
    );
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || !content.trim()) {
      throw new AIError('bad_response', 'Empty completion');
    }
    if (!skipLimit) await incrementUsage();
    return content;
  } catch (err) {
    if (err instanceof AIError) {
      console.warn('[AIService] HF call failed', err.kind, err.message);
      throw err;
    }
    const status = err?.response?.status;
    const body   = err?.response?.data;
    console.warn('[AIService] HF call failed', { status, body, message: err?.message });
    if (status === 429) {
      throw new AIError('rate_limit', 'HuggingFace rate-limited', { status });
    }
    if (status === 401 || status === 403) {
      throw new AIError('config', 'HuggingFace key rejected (check it has Inference Providers access)', { status });
    }
    if (status === 404) {
      throw new AIError('config', `Model ${HF_MODEL} not found — set EXPO_PUBLIC_HUGGING_FACE_MODEL`, { status });
    }
    throw new AIError('network', err.message || 'Network error', { cause: err, status });
  }
};

// Extracts the first JSON object out of an LLM reply. Handles plain JSON,
// fenced ```json blocks, and prose-wrapped JSON.
const parseJsonReply = (text) => {
  if (typeof text !== 'string') return null;
  const stripped = text.replace(/```json/gi, '').replace(/```/g, '').trim();
  try {
    return JSON.parse(stripped);
  } catch {
    const m = stripped.match(/\{[\s\S]*\}/);
    if (m) {
      try { return JSON.parse(m[0]); } catch {}
    }
    return null;
  }
};

// ── Context builder ────────────────────────────────────────────────────
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

// ── System prompt shared by JSON-returning calls ──────────────────────
const JSON_SYSTEM = 'You are a careful Indian-markets financial analyst. Respond ONLY with valid JSON matching the schema in the user message. No prose, no markdown fences, no commentary outside the JSON object.';

// ── Public methods ─────────────────────────────────────────────────────

// analyzeStock returns: { verdict, confidence, reasons[], risks[], targetPrice, timeHorizon }
export const analyzeStock = async (symbol, fundamentals = {}, userContextOverride) => {
  const userContext = userContextOverride || await buildUserContext();
  try {
    const text = await callHuggingFace(
      [
        { role: 'system', content: JSON_SYSTEM },
        {
          role: 'user',
          content:
`Analyse the Indian ${fundamentals?.type === 'MF' ? 'mutual fund' : 'stock'} ${symbol} for this investor.

Fundamentals: ${JSON.stringify(fundamentals)}
Investor snapshot: ${JSON.stringify(userContext)}

Return JSON exactly in this schema:
{
  "verdict": "BUY" | "HOLD" | "SELL",
  "confidence": <integer 0-100>,
  "reasons": [up to 3 short strings, each <120 chars],
  "risks": [up to 2 short strings, each <120 chars],
  "targetPrice": <number in INR or null>,
  "timeHorizon": "<e.g. 6-12 months>"
}`,
        },
      ],
      { maxTokens: 600, temperature: 0.4 },
    );
    return normaliseStockAnalysis(parseJsonReply(text), symbol);
  } catch (err) {
    return offlineStockAnalysis(symbol, err);
  }
};

// getFinanceInsight returns: { insight, actionSuggestion, urgency }
export const getFinanceInsight = async (expenseData, loanData, portfolioData, goals) => {
  try {
    const text = await callHuggingFace(
      [
        { role: 'system', content: JSON_SYSTEM },
        {
          role: 'user',
          content:
`Generate one personal-finance insight for this user.

Expenses: ${JSON.stringify(expenseData)}
Loans: ${JSON.stringify(loanData)}
Portfolio: ${JSON.stringify(portfolioData)}
Goals: ${JSON.stringify(goals)}

Return JSON:
{
  "insight": "<one sentence, <180 chars>",
  "actionSuggestion": "<one short next step or null>",
  "urgency": "low" | "medium" | "high"
}`,
        },
      ],
      { maxTokens: 300, temperature: 0.5 },
    );
    const data = parseJsonReply(text) || {};
    return {
      insight: String(data.insight || '').slice(0, 200) || 'No insight available right now.',
      actionSuggestion: data.actionSuggestion || null,
      urgency: ['low', 'medium', 'high'].includes(data.urgency) ? data.urgency : 'low',
    };
  } catch {
    return {
      insight: 'Insight unavailable — reconnect to refresh.',
      actionSuggestion: null,
      urgency: 'low',
      offline: true,
    };
  }
};

// getDailyDashboardNudge returns a single string (max 80 chars). Cached 6h.
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
    const text = await callHuggingFace(
      [
        {
          role: 'system',
          content: 'You write one punchy finance nudge for an Indian retail investor. Max 80 characters. No quotes, no emojis, no markdown — return only the sentence.',
        },
        {
          role: 'user',
          content:
`Month expenses: ${JSON.stringify(monthExpenses)}
Month budget: ${JSON.stringify(monthBudget)}
Portfolio: ${JSON.stringify(portfolioChange)}

Write the nudge.`,
        },
      ],
      { maxTokens: 80, temperature: 0.7 },
    );
    const nudge = String(text || '').replace(/^["']|["']$/g, '').replace(/\n.*$/s, '').slice(0, 80).trim();
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
    const text = await callHuggingFace(
      [
        { role: 'system', content: JSON_SYSTEM },
        {
          role: 'user',
          content:
`Review this Indian retail investor's portfolio and give rebalancing advice.

Holdings: ${JSON.stringify(holdings)}
Monthly income: ${JSON.stringify(monthlyIncome)}
Monthly expenses: ${JSON.stringify(monthlyExpenses)}
Goals: ${JSON.stringify(goals)}

Return JSON:
{
  "rebalanceSuggestions": [up to 5 short strings, each <140 chars],
  "riskLevel": "conservative" | "moderate" | "aggressive",
  "healthScore": <integer 0-100>
}`,
        },
      ],
      { maxTokens: 500, temperature: 0.4 },
    );
    const data = parseJsonReply(text) || {};
    return {
      rebalanceSuggestions: Array.isArray(data.rebalanceSuggestions) ? data.rebalanceSuggestions.slice(0, 5) : [],
      riskLevel:   data.riskLevel || 'moderate',
      healthScore: Math.max(0, Math.min(100, Number(data.healthScore) || 50)),
    };
  } catch {
    return { rebalanceSuggestions: [], riskLevel: 'moderate', healthScore: 50, offline: true };
  }
};

// chatMessage returns the assistant string. Last 10 messages of
// `conversationHistory` are sent; the rest are trimmed to save tokens.
export const chatMessage = async (userMessage, conversationHistory = [], fullContextOverride) => {
  const context = fullContextOverride || await buildUserContext();
  const history = (conversationHistory || []).slice(-10).map((m) => ({
    role: m.role === 'assistant' || m.role === 'system' ? m.role : 'user',
    content: String(m.content || m.text || '').slice(0, 1500),
  }));
  try {
    const text = await callHuggingFace(
      [
        {
          role: 'system',
          content:
`You are CalcMint, a friendly Indian personal-finance assistant. Be concise (under 120 words unless asked for detail). Speak in INR. Never invent numbers — if you don't know, say so. The user's current snapshot is: ${JSON.stringify(context)}`,
        },
        ...history,
        { role: 'user', content: String(userMessage || '').slice(0, 2000) },
      ],
      { maxTokens: 600, temperature: 0.6 },
    );
    return text;
  } catch (err) {
    if (err.kind === 'limit_reached') {
      return 'You’ve hit today’s free AI limit. Upgrade to Pro to keep chatting — your conversation is saved.';
    }
    return 'I can’t reach the model right now. Try again once you’re back online.';
  }
};

// generateNewsForHolding returns up to 4 items:
//   { title, summary, source, sentiment: 'Positive'|'Neutral'|'Negative' }
export const generateNewsForHolding = async (holding) => {
  try {
    const text = await callHuggingFace(
      [
        { role: 'system', content: JSON_SYSTEM },
        {
          role: 'user',
          content:
`Write up to 4 plausible recent news headlines for the Indian ${holding.type === 'MF' ? 'mutual fund' : 'stock'} ${holding.symbol} (${holding.name}, ${holding.exchange}).

Return JSON:
{
  "items": [
    {
      "title": "<headline, <120 chars>",
      "summary": "<2-sentence summary, <240 chars>",
      "source": "<plausible Indian outlet, e.g. Mint, ET Markets>",
      "sentiment": "Positive" | "Neutral" | "Negative"
    }
  ]
}`,
        },
      ],
      { maxTokens: 600, temperature: 0.6 },
    );
    const data = parseJsonReply(text) || {};
    const items = Array.isArray(data.items) ? data.items : [];
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
    const text = await callHuggingFace(
      [
        { role: 'system', content: JSON_SYSTEM },
        {
          role: 'user',
          content:
`Assess this financial goal for an Indian investor.

Goal: ${JSON.stringify(goal)}
Current savings: ${JSON.stringify(currentSavings)}
Monthly expenses: ${JSON.stringify(monthlyExpenses)}
Portfolio: ${JSON.stringify(portfolio)}

Return JSON:
{
  "onTrack": <true|false>,
  "suggestion": "<one short actionable line, <180 chars>",
  "monthlyNeeded": <INR amount needed per month, integer>
}`,
        },
      ],
      { maxTokens: 250, temperature: 0.4 },
    );
    const data = parseJsonReply(text) || {};
    return {
      onTrack: Boolean(data.onTrack),
      suggestion: String(data.suggestion || '').slice(0, 200),
      monthlyNeeded: Math.max(0, Math.round(Number(data.monthlyNeeded) || 0)),
    };
  } catch {
    return { onTrack: false, suggestion: 'Goal advice is offline.', monthlyNeeded: 0, offline: true };
  }
};

// ── Local normalisers / fallbacks ─────────────────────────────────────
const normaliseStockAnalysis = (data, symbol) => {
  const d = data || {};
  const verdict = ['BUY', 'HOLD', 'SELL'].includes(d.verdict) ? d.verdict : 'HOLD';
  const confidence = Math.max(0, Math.min(100, Number(d.confidence) || 50));
  const reasons = Array.isArray(d.reasons) ? d.reasons.slice(0, 3).map((r) => String(r).slice(0, 200)) : [];
  const risks   = Array.isArray(d.risks)   ? d.risks.slice(0, 2).map((r) => String(r).slice(0, 200)) : [];
  const targetPrice = d.targetPrice != null ? Number(d.targetPrice) : null;
  const timeHorizon = d.timeHorizon || '6-12 months';
  return { symbol, verdict, confidence, reasons, risks, targetPrice, timeHorizon };
};

const offlineMessageFor = (err) => {
  switch (err?.kind) {
    case 'config':       return err.message || 'AI not configured. Check EXPO_PUBLIC_HUGGING_FACE_API_KEY.';
    case 'rate_limit':   return 'HuggingFace rate-limited — try again in a minute.';
    case 'limit_reached':return 'Daily AI cap hit — resets after midnight.';
    case 'bad_response': return 'AI returned an empty reply — try Re-analyse.';
    case 'network':      return `AI network error${err?.status ? ` (${err.status})` : ''} — check connection.`;
    default:             return 'AI unreachable — showing neutral default.';
  }
};

const offlineStockAnalysis = (symbol, err) => ({
  symbol,
  verdict: 'HOLD',
  confidence: 50,
  reasons: [offlineMessageFor(err)],
  risks: [],
  targetPrice: null,
  timeHorizon: '—',
  offline: true,
  errorKind: err?.kind || 'unknown',
});

// Back-compat shim — old code called setProxyUrlOverride. Now a no-op
// since we no longer have a proxy.
export const setProxyUrlOverride = async () => {};

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
