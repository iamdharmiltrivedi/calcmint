// Alpha Vantage live quote with offline-graceful cache fallback.
// Cache TTL: 5 min. On API failure we return the last cached price.
import axios from 'axios';
import { SL_TTL } from '../../constants/storageKeys';
import { getCachedPrice, upsertCachedPrice } from './MarketsDB';

const API_URL = 'https://www.alphavantage.co/query';
// NOTE: ported from existing Stock Lens build. Move to env when feasible.
const API_KEY = '02IWDKO0AM3FZ0XG';

export const fetchStockPrice = async (symbol, opts = {}) => {
  const { force = false } = opts;
  const cached = await getCachedPrice(symbol);
  if (!force && cached && Date.now() - cached.lastUpdated < SL_TTL.STOCK_PRICE) {
    return cached;
  }
  try {
    const { data } = await axios.get(API_URL, {
      params: { function: 'GLOBAL_QUOTE', symbol, apikey: API_KEY },
      timeout: 8000,
    });
    const q = data && data['Global Quote'];
    if (!q || !q['05. price']) {
      if (cached) return cached;          // stale-on-empty
      throw new Error('Empty quote');
    }
    const price = {
      symbol,
      currentPrice:  parseFloat(q['05. price']) || 0,
      change:        parseFloat(q['09. change']) || 0,
      changePercent: parseFloat(String(q['10. change percent'] || '0').replace('%', '')) || 0,
      high:          parseFloat(q['03. high']) || undefined,
      low:           parseFloat(q['04. low'])  || undefined,
      open:          parseFloat(q['02. open']) || undefined,
      previousClose: parseFloat(q['08. previous close']) || undefined,
      volume:        parseInt(q['06. volume'], 10) || undefined,
      lastUpdated:   Date.now(),
    };
    await upsertCachedPrice(price);
    return price;
  } catch (err) {
    if (cached) return cached;            // stale-on-error
    throw err;
  }
};

export const fetchManyPrices = async (symbols) => {
  // AV free tier: 5 req/min. Serialise with small delay to stay safe.
  const out = {};
  for (const sym of symbols) {
    try {
      out[sym] = await fetchStockPrice(sym);
    } catch {
      out[sym] = null;
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  return out;
};
