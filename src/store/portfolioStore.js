// Zustand store for the Markets tab portfolio. Persists via MarketsDB.
import { create } from 'zustand';
import {
  getAllHoldings, insertHolding, updateHolding, deleteHolding,
  getAllCachedPrices,
} from '../services/markets/MarketsDB';

export const usePortfolioStore = create((set, get) => ({
  holdings: [],
  prices: {},        // symbol → StockPrice
  analyses: {},      // symbol → AIAnalysis
  isLoading: false,
  error: null,

  // ── Hydration ────────────────────────────────────────────────────────
  load: async () => {
    set({ isLoading: true, error: null });
    try {
      const [holdings, prices] = await Promise.all([getAllHoldings(), getAllCachedPrices()]);
      set({ holdings, prices, isLoading: false });
    } catch (e) {
      set({ error: String(e), isLoading: false });
    }
  },

  // ── Mutations ────────────────────────────────────────────────────────
  add: async (input) => {
    const h = await insertHolding(input);
    set((s) => ({ holdings: [h, ...s.holdings] }));
    return h;
  },

  edit: async (holding) => {
    await updateHolding(holding);
    set((s) => ({ holdings: s.holdings.map((x) => (x.id === holding.id ? holding : x)) }));
  },

  remove: async (id) => {
    await deleteHolding(id);
    set((s) => ({ holdings: s.holdings.filter((h) => h.id !== id) }));
  },

  // ── In-memory cache helpers ──────────────────────────────────────────
  setPrice: (symbol, price) => set((s) => ({ prices: { ...s.prices, [symbol]: price } })),
  setAnalysis: (symbol, analysis) => set((s) => ({ analyses: { ...s.analyses, [symbol]: analysis } })),

  // ── Derived ──────────────────────────────────────────────────────────
  getSummary: () => {
    const { holdings, prices } = get();
    let totalInvested = 0;
    let totalCurrent  = 0;
    for (const h of holdings) {
      const p = prices[h.symbol];
      const cur = p ? p.currentPrice : h.buyPrice;
      totalInvested += h.buyPrice * h.quantity;
      totalCurrent  += cur * h.quantity;
    }
    const totalProfitLoss = totalCurrent - totalInvested;
    const totalProfitLossPercent = totalInvested > 0 ? (totalProfitLoss / totalInvested) * 100 : 0;
    return { totalInvested, totalCurrent, totalProfitLoss, totalProfitLossPercent, count: holdings.length };
  },

  getHoldingWithMetrics: (id) => {
    const { holdings, prices, analyses } = get();
    const h = holdings.find((x) => x.id === id);
    if (!h) return null;
    const p = prices[h.symbol];
    const currentPrice  = p ? p.currentPrice : h.buyPrice;
    const currentValue  = currentPrice * h.quantity;
    const investedValue = h.buyPrice    * h.quantity;
    const profitLoss    = currentValue - investedValue;
    const profitLossPercent = investedValue > 0 ? (profitLoss / investedValue) * 100 : 0;
    return {
      holding: h,
      currentPrice,
      currentValue,
      investedValue,
      profitLoss,
      profitLossPercent,
      aiAnalysis: analyses[h.symbol] || null,
    };
  },

  getAllWithMetrics: () => {
    const { holdings, prices, analyses } = get();
    return holdings.map((h) => {
      const p = prices[h.symbol];
      const cp = p ? p.currentPrice : h.buyPrice;
      const cv = cp * h.quantity;
      const iv = h.buyPrice * h.quantity;
      const pl = cv - iv;
      return {
        holding: h,
        currentPrice: cp,
        currentValue: cv,
        investedValue: iv,
        profitLoss: pl,
        profitLossPercent: iv > 0 ? (pl / iv) * 100 : 0,
        aiAnalysis: analyses[h.symbol] || null,
      };
    });
  },
}));
