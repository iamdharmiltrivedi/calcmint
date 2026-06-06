// StockService — Yahoo Finance integration for Indian stocks (NSE + BSE).
//
// Why not the yahoo-finance2 npm package? It's Node-only (depends on
// tough-cookie, http, fs, etc.) and Metro can't bundle it for React Native.
// We hit the same public JSON endpoints over axios directly — no API key,
// works on-device.
//
// Endpoints used:
//   query2.finance.yahoo.com/v1/finance/search       → searchStocks
//   query1.finance.yahoo.com/v8/finance/chart/{sym}  → getQuote + getHistoricalData
//   query2.finance.yahoo.com/v10/finance/quoteSummary → getCompanyProfile (best-effort)

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SL_KEYS, SL_TTL } from '../../constants/storageKeys';

const SEARCH_BASE    = 'https://query2.finance.yahoo.com/v1/finance/search';
const CHART_BASE     = 'https://query1.finance.yahoo.com/v8/finance/chart';
const QUOTE_SUM_BASE = 'https://query2.finance.yahoo.com/v10/finance/quoteSummary';

// ── Public types (JSDoc — project is JS, not TS) ────────────────────────
/**
 * @typedef {Object} StockSearchResult
 * @property {string} symbol    Yahoo symbol, e.g. "RELIANCE.NS"
 * @property {string} name      Company name
 * @property {string} exchange  "NSE" | "BSE"
 * @property {string} type      Quote type, e.g. "EQUITY"
 *
 * @typedef {Object} StockQuote
 * @property {string} symbol
 * @property {string} companyName
 * @property {number} currentPrice
 * @property {number} previousClose
 * @property {number} open
 * @property {number} dayHigh
 * @property {number} dayLow
 * @property {string} currency
 * @property {number} lastUpdated   Epoch ms when cached
 *
 * @typedef {Object} CompanyProfile
 * @property {string}  symbol
 * @property {string}  name
 * @property {string}  exchange
 * @property {string}  currency
 * @property {string} [industry]
 * @property {string} [sector]
 * @property {string} [summary]
 * @property {string} [website]
 * @property {string} [country]
 *
 * @typedef {Object} HistoricalPoint
 * @property {number}      timestamp  Epoch ms
 * @property {number|null} open
 * @property {number|null} high
 * @property {number|null} low
 * @property {number}      close
 * @property {number|null} [volume]
 */

const ax = axios.create({
  timeout: 10000,
  headers: {
    // Yahoo rejects some POPs without an explicit UA.
    'User-Agent': 'CalcMint/1.0 (Expo; +https://calcmint.app)',
    Accept: 'application/json',
  },
});

// One linear retry for transient (5xx / network) failures.
const withRetry = async (label, fn) => {
  try {
    return await fn();
  } catch (err) {
    const status = err?.response?.status;
    const retryable = !status || status >= 500;
    if (!retryable) {
      console.warn(`[StockService] ${label} failed (no retry)`, {
        status, message: err?.message,
      });
      throw err;
    }
    await new Promise((r) => setTimeout(r, 500));
    try {
      return await fn();
    } catch (err2) {
      console.warn(`[StockService] ${label} failed after retry`, {
        status: err2?.response?.status, message: err2?.message,
      });
      throw err2;
    }
  }
};

// ── AsyncStorage cache ─────────────────────────────────────────────────
const cacheKey = (kind, key) => `${SL_KEYS.STOCK_CACHE}:${kind}:${key}`;

const fromCache = async (kind, key, ttl) => {
  try {
    const raw = await AsyncStorage.getItem(cacheKey(kind, key));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.lastUpdated >= ttl) return null;
    return parsed.value;
  } catch {
    return null;
  }
};

const toCache = async (kind, key, value) => {
  try {
    await AsyncStorage.setItem(
      cacheKey(kind, key),
      JSON.stringify({ value, lastUpdated: Date.now() }),
    );
  } catch (e) {
    console.warn('[StockService] cache write failed', kind, key, e);
  }
};

// ── searchStocks ────────────────────────────────────────────────────────
// Yahoo's listing fields:
//   `symbol`   — e.g. "SBIN.NS", "RELIANCE.BO", "SBI" (US)
//   `exchange` — short code: NSE → "NSI", BSE → "BSE", NYSE → "NYQ"
//   `exchDisp` — display label: "NSE", "Bombay", "NYSE"
// We accept any of: a .NS/.BO suffix, the exchange short code, or an
// exchDisp that names an Indian venue. Earlier we only checked the first
// two, which dropped some BSE rows whose suffix is missing.
const isIndianListing = (r) => {
  const sym = r?.symbol || '';
  if (/\.(NS|BO)$/i.test(sym)) return true;
  const ex = String(r?.exchange || '').toUpperCase();
  if (ex === 'NSI' || ex === 'BSE' || ex === 'NSE') return true;
  const exDisp = String(r?.exchDisp || '').toUpperCase();
  return exDisp === 'NSE' || exDisp === 'BSE' || exDisp === 'BOMBAY';
};

const indianExchangeLabel = (r) => {
  if (/\.NS$/i.test(r.symbol)) return 'NSE';
  if (/\.BO$/i.test(r.symbol)) return 'BSE';
  const ex = String(r.exchange || '').toUpperCase();
  if (ex === 'NSI' || ex === 'NSE') return 'NSE';
  if (ex === 'BSE') return 'BSE';
  const exDisp = String(r.exchDisp || '').toUpperCase();
  if (exDisp === 'BOMBAY' || exDisp === 'BSE') return 'BSE';
  return 'NSE';
};

const isStockLikeType = (r) => {
  const t = String(r?.quoteType || '').toUpperCase();
  // Accept equities, ETFs, and uncategorised rows. Reject mutual funds —
  // the app has a dedicated MF flow backed by mfapi.in.
  if (!t) return true;
  return t === 'EQUITY' || t === 'ETF';
};

/**
 * Search Yahoo Finance by company name or ticker, restricted to NSE/BSE
 * equities + ETFs. We deliberately do NOT pass region=IN — for short
 * queries like "sbi" that param sometimes returns an empty quotes array
 * even though Yahoo's default search returns the relevant Indian rows
 * (SBIN.NS, SBINEQWETF.NS, …).
 * @param {string} query
 * @returns {Promise<StockSearchResult[]>}
 */
export const searchStocks = async (query) => {
  const q = (query || '').trim();
  if (q.length < 2) return [];

  const cached = await fromCache('search', q.toLowerCase(), SL_TTL.STOCK_SEARCH);
  if (cached) return cached;

  const quotes = await withRetry('search', async () => {
    const res = await ax.get(SEARCH_BASE, {
      params: {
        q,
        quotesCount: 30,
        newsCount: 0,
      },
    });
    const raw = res?.data?.quotes;
    return Array.isArray(raw) ? raw : [];
  });

  /** @type {StockSearchResult[]} */
  const filtered = quotes
    .filter(isIndianListing)
    .filter(isStockLikeType)
    .map((r) => ({
      symbol:   r.symbol,
      name:     r.longname || r.shortname || r.symbol,
      exchange: indianExchangeLabel(r),
      type:     r.quoteType || 'EQUITY',
    }));

  // De-dupe in case Yahoo returns the same listing twice.
  const seen = new Set();
  const deduped = [];
  for (const r of filtered) {
    const key = `${r.exchange}:${r.symbol}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(r);
  }

  // Only cache non-empty results — otherwise a single bad lookup pins
  // "no results" for the full TTL even after the user retries.
  if (deduped.length > 0) {
    await toCache('search', q.toLowerCase(), deduped);
  }
  return deduped;
};

// ── getQuote ────────────────────────────────────────────────────────────
/**
 * Fetches a live quote via /v8/chart (no crumb auth required, unlike v7/quote).
 * @param {string} symbol e.g. "RELIANCE.NS"
 * @param {{ force?: boolean }} [opts]
 * @returns {Promise<StockQuote>}
 */
export const getQuote = async (symbol, opts = {}) => {
  if (!symbol) throw new Error('symbol is required');
  const { force = false } = opts;

  if (!force) {
    const cached = await fromCache('quote', symbol, SL_TTL.STOCK_PRICE);
    if (cached) return cached;
  }

  const data = await withRetry(`quote ${symbol}`, async () => {
    const res = await ax.get(`${CHART_BASE}/${encodeURIComponent(symbol)}`, {
      params: { interval: '1d', range: '5d' },
    });
    return res.data;
  });

  const result = data?.chart?.result?.[0];
  const meta   = result?.meta;
  if (!meta || typeof meta.regularMarketPrice !== 'number') {
    throw new Error('No quote data');
  }

  // Open / day-high / day-low aren't always on meta — fall back to the
  // latest candle when missing.
  const candles = result?.indicators?.quote?.[0] || {};
  const lastIdx = (candles.close || []).length - 1;
  const candleAt = (arr) => (Array.isArray(arr) && lastIdx >= 0 ? arr[lastIdx] : undefined);

  /** @type {StockQuote} */
  const quote = {
    symbol,
    companyName:   meta.longName || meta.shortName || symbol,
    currentPrice:  meta.regularMarketPrice,
    previousClose: meta.chartPreviousClose ?? meta.previousClose ?? meta.regularMarketPrice,
    open:          meta.regularMarketOpen   ?? candleAt(candles.open) ?? meta.regularMarketPrice,
    dayHigh:       meta.regularMarketDayHigh ?? candleAt(candles.high) ?? meta.regularMarketPrice,
    dayLow:        meta.regularMarketDayLow  ?? candleAt(candles.low)  ?? meta.regularMarketPrice,
    currency:      meta.currency || 'INR',
    lastUpdated:   Date.now(),
  };
  await toCache('quote', symbol, quote);
  return quote;
};

// ── getCompanyProfile ───────────────────────────────────────────────────
/**
 * Best-effort: tries quoteSummary, falls back to chart meta if that POP
 * requires a crumb (which we don't have).
 * @param {string} symbol
 * @returns {Promise<CompanyProfile>}
 */
export const getCompanyProfile = async (symbol) => {
  if (!symbol) throw new Error('symbol is required');
  const cached = await fromCache('profile', symbol, SL_TTL.STOCK_PROFILE);
  if (cached) return cached;

  /** @type {CompanyProfile | null} */
  let profile = null;
  try {
    const { data } = await ax.get(
      `${QUOTE_SUM_BASE}/${encodeURIComponent(symbol)}`,
      { params: { modules: 'assetProfile,summaryProfile,price' } },
    );
    const r  = data?.quoteSummary?.result?.[0];
    const ap = r?.assetProfile || r?.summaryProfile || {};
    const p  = r?.price || {};
    if (r) {
      profile = {
        symbol,
        name:     p.longName || p.shortName || symbol,
        industry: ap.industry,
        sector:   ap.sector,
        summary:  ap.longBusinessSummary,
        website:  ap.website,
        country:  ap.country,
        currency: p.currency || 'INR',
        exchange: p.exchange || (/\.NS$/i.test(symbol) ? 'NSE' : 'BSE'),
      };
    }
  } catch {
    /* fall through to chart-meta fallback */
  }

  if (!profile) {
    const q = await getQuote(symbol);
    profile = {
      symbol,
      name:     q.companyName,
      currency: q.currency,
      exchange: /\.NS$/i.test(symbol) ? 'NSE' : 'BSE',
    };
  }

  await toCache('profile', symbol, profile);
  return profile;
};

// ── getHistoricalData ──────────────────────────────────────────────────
/**
 * @param {string} symbol
 * @param {{ range?: string, interval?: string, force?: boolean }} [opts]
 *   range:    '1d' | '5d' | '1mo' | '3mo' | '6mo' | '1y' | '5y' | 'max'
 *   interval: '1m' | '5m' | '15m' | '30m' | '1h' | '1d' | '1wk' | '1mo'
 * @returns {Promise<HistoricalPoint[]>}
 */
export const getHistoricalData = async (symbol, opts = {}) => {
  if (!symbol) throw new Error('symbol is required');
  const { range = '1mo', interval = '1d', force = false } = opts;
  const cacheId = `${symbol}|${range}|${interval}`;

  if (!force) {
    const cached = await fromCache('history', cacheId, SL_TTL.STOCK_HISTORY);
    if (cached) return cached;
  }

  const data = await withRetry(`history ${symbol}`, async () => {
    const res = await ax.get(`${CHART_BASE}/${encodeURIComponent(symbol)}`, {
      params: { range, interval },
    });
    return res.data;
  });

  const result = data?.chart?.result?.[0];
  const ts = result?.timestamp || [];
  const q  = result?.indicators?.quote?.[0] || {};
  /** @type {HistoricalPoint[]} */
  const points = ts.map((t, i) => ({
    timestamp: t * 1000,
    open:   q.open?.[i]   ?? null,
    high:   q.high?.[i]   ?? null,
    low:    q.low?.[i]    ?? null,
    close:  q.close?.[i],
    volume: q.volume?.[i] ?? null,
  })).filter((p) => p.close != null);

  await toCache('history', cacheId, points);
  return points;
};

// Default export mirrors the spec's import pattern:
//   import StockService from '.../StockService';
//   await StockService.searchStocks('Reliance');
const StockService = {
  searchStocks,
  getQuote,
  getCompanyProfile,
  getHistoricalData,
};
export default StockService;
