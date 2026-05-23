// MFAPI.in — free, no-auth NAV lookup for Indian mutual funds.
import axios from 'axios';
import { SL_TTL } from '../../constants/storageKeys';
import { getCachedPrice, upsertCachedPrice } from './MarketsDB';

const BASE = 'https://api.mfapi.in/mf';

export const fetchMFNav = async (schemeCode, opts = {}) => {
  const { force = false } = opts;
  const cached = await getCachedPrice(schemeCode);
  if (!force && cached && Date.now() - cached.lastUpdated < SL_TTL.MF_NAV) {
    return cached;
  }
  try {
    const { data } = await axios.get(`${BASE}/${schemeCode}`, { timeout: 8000 });
    if (!data || !data.data || !data.data.length) {
      if (cached) return cached;
      throw new Error('No NAV data');
    }
    const latest = data.data[0];
    const prev   = data.data[1];
    const nav    = parseFloat(latest.nav) || 0;
    const prevNav = prev ? parseFloat(prev.nav) || nav : nav;
    const change  = nav - prevNav;
    const price = {
      symbol: schemeCode,
      currentPrice: nav,
      change,
      changePercent: prevNav ? (change / prevNav) * 100 : 0,
      previousClose: prevNav,
      lastUpdated: Date.now(),
    };
    await upsertCachedPrice(price);
    return price;
  } catch (err) {
    if (cached) return cached;
    throw err;
  }
};

export const searchMutualFunds = async (query) => {
  if (!query || !query.trim()) return [];
  try {
    const { data } = await axios.get('https://api.mfapi.in/mf/search', {
      params: { q: query },
      timeout: 8000,
    });
    return Array.isArray(data) ? data.slice(0, 30) : [];
  } catch {
    return [];
  }
};
