// AsyncStorage-backed persistence for Markets data. Keeps Stock Lens
// portable inside CalcMint without adding expo-sqlite. All keys are
// namespaced via SL_KEYS so they cannot collide with CalcMint's "@fc_".
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SL_KEYS, SL_TTL } from '../../constants/storageKeys';

const readJSON = async (key, fallback) => {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const writeJSON = async (key, value) => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('[MarketsDB]', key, e);
  }
};

// ── Holdings ───────────────────────────────────────────────────────────
export const getAllHoldings = () => readJSON(SL_KEYS.HOLDINGS, []);

export const getHoldingById = async (id) => {
  const all = await getAllHoldings();
  return all.find((h) => h.id === id) || null;
};

export const insertHolding = async (input) => {
  const all = await getAllHoldings();
  const now = Date.now();
  const holding = {
    ...input,
    id: `h_${now}_${Math.random().toString(36).slice(2, 7)}`,
    createdAt: now,
    updatedAt: now,
  };
  await writeJSON(SL_KEYS.HOLDINGS, [holding, ...all]);
  return holding;
};

export const updateHolding = async (holding) => {
  const all = await getAllHoldings();
  const next = all.map((h) => (h.id === holding.id ? { ...holding, updatedAt: Date.now() } : h));
  await writeJSON(SL_KEYS.HOLDINGS, next);
};

export const deleteHolding = async (id) => {
  const all = await getAllHoldings();
  await writeJSON(SL_KEYS.HOLDINGS, all.filter((h) => h.id !== id));
};

// ── Watchlist ──────────────────────────────────────────────────────────
export const getWatchlist = () => readJSON(SL_KEYS.WATCHLIST, []);

export const addToWatchlist = async (item) => {
  const list = await getWatchlist();
  if (list.some((w) => w.symbol === item.symbol)) return list;
  const next = [{ ...item, addedAt: Date.now() }, ...list];
  await writeJSON(SL_KEYS.WATCHLIST, next);
  return next;
};

export const removeFromWatchlist = async (symbol) => {
  const list = await getWatchlist();
  const next = list.filter((w) => w.symbol !== symbol);
  await writeJSON(SL_KEYS.WATCHLIST, next);
  return next;
};

// ── Price cache ────────────────────────────────────────────────────────
export const getCachedPrice = async (symbol) => {
  const cache = await readJSON(SL_KEYS.PRICE_CACHE, {});
  return cache[symbol] || null;
};

export const upsertCachedPrice = async (price) => {
  const cache = await readJSON(SL_KEYS.PRICE_CACHE, {});
  cache[price.symbol] = price;
  await writeJSON(SL_KEYS.PRICE_CACHE, cache);
};

export const getAllCachedPrices = () => readJSON(SL_KEYS.PRICE_CACHE, {});

// ── News cache ─────────────────────────────────────────────────────────
export const getAllCachedNews = () => readJSON(SL_KEYS.NEWS_CACHE, []);

export const upsertNewsItems = async (items) => {
  const existing = await getAllCachedNews();
  const byId = new Map(existing.map((n) => [n.id, n]));
  for (const it of items) byId.set(it.id, it);
  // Prune anything older than NEWS TTL * 4 to bound storage.
  const cutoff = Date.now() - SL_TTL.NEWS * 4;
  const next = Array.from(byId.values())
    .filter((n) => n.cachedAt > cutoff)
    .sort((a, b) => b.publishedAt - a.publishedAt);
  await writeJSON(SL_KEYS.NEWS_CACHE, next);
  return next;
};

// ── AI analysis cache ──────────────────────────────────────────────────
export const getCachedAnalysis = async (symbol) => {
  const cache = await readJSON(SL_KEYS.AI_CACHE, {});
  return cache[symbol] || null;
};

export const upsertAnalysis = async (analysis) => {
  const cache = await readJSON(SL_KEYS.AI_CACHE, {});
  cache[analysis.symbol] = analysis;
  await writeJSON(SL_KEYS.AI_CACHE, cache);
};

// ── IPO cache ──────────────────────────────────────────────────────────
export const getCachedIPOs = () => readJSON(SL_KEYS.IPO_CACHE, { fetchedAt: 0, items: [] });
export const setCachedIPOs = (payload) => writeJSON(SL_KEYS.IPO_CACHE, payload);

// ── Recent searches ────────────────────────────────────────────────────
export const getRecentSearches = () => readJSON(SL_KEYS.RECENT_SEARCHES, []);
export const pushRecentSearch = async (q) => {
  if (!q || !q.trim()) return;
  const list = await getRecentSearches();
  const next = [q, ...list.filter((x) => x !== q)].slice(0, 8);
  await writeJSON(SL_KEYS.RECENT_SEARCHES, next);
};

// ── Alerts ─────────────────────────────────────────────────────────────
export const getAlerts = () => readJSON(SL_KEYS.ALERTS, []);
export const setAlerts = (alerts) => writeJSON(SL_KEYS.ALERTS, alerts);
