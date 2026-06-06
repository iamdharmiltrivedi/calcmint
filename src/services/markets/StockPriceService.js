// Live stock quote with offline-graceful cache fallback. Cache TTL: 5 min.
// Backed by Yahoo Finance via StockService — Indian listings are resolved
// against NSE / BSE using the .NS / .BO suffix derived from the holding's
// exchange.
import { SL_TTL } from '../../constants/storageKeys';
import { getCachedPrice, upsertCachedPrice } from './MarketsDB';
import { getQuote } from './StockService';

const toYahooSymbol = (sym, exchange) => {
  const s = String(sym || '');
  if (/\.(NS|BO)$/i.test(s)) return s;
  const suffix = String(exchange || 'NSE').toUpperCase() === 'BSE' ? '.BO' : '.NS';
  return `${s}${suffix}`;
};

// Accepts (symbol, opts) for backwards compatibility OR (holdingLike, opts)
// where holdingLike = { symbol, exchange }. The exchange — when known —
// disambiguates NSE vs BSE listings on Yahoo.
export const fetchStockPrice = async (input, opts = {}) => {
  const symbol   = typeof input === 'string' ? input : input?.symbol;
  const exchange = typeof input === 'string' ? opts.exchange : input?.exchange;
  const { force = false } = opts;
  if (!symbol) throw new Error('symbol is required');

  const cached = await getCachedPrice(symbol);
  if (!force && cached && Date.now() - cached.lastUpdated < SL_TTL.STOCK_PRICE) {
    return cached;
  }

  try {
    const yahooSym = toYahooSymbol(symbol, exchange);
    const q = await getQuote(yahooSym, { force });
    const current = typeof q.currentPrice === 'number' ? q.currentPrice : 0;
    const prev    = typeof q.previousClose === 'number' ? q.previousClose : current;
    const change  = current - prev;
    const changePercent = prev > 0 ? (change / prev) * 100 : 0;

    const price = {
      symbol,
      currentPrice:  current,
      change,
      changePercent,
      high:          q.dayHigh,
      low:           q.dayLow,
      open:          q.open,
      previousClose: prev,
      lastUpdated:   Date.now(),
    };
    if (!current) {
      if (cached) return cached;
      throw new Error('Empty quote');
    }
    await upsertCachedPrice(price);
    return price;
  } catch (err) {
    if (cached) return cached;
    throw err;
  }
};

export const fetchManyPrices = async (items) => {
  const out = {};
  for (const item of items) {
    const sym = typeof item === 'string' ? item : item?.symbol;
    if (!sym) continue;
    try {
      out[sym] = await fetchStockPrice(item);
    } catch {
      out[sym] = null;
    }
    await new Promise((r) => setTimeout(r, 120));
  }
  return out;
};
