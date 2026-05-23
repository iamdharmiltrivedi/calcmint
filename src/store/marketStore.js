// Zustand store for live market data: prices, news, AI analyses,
// watchlist. Owns the fetch loops; persists news + watchlist via DB.
import { create } from 'zustand';
import { fetchStockPrice } from '../services/markets/StockPriceService';
import { fetchMFNav } from '../services/markets/MFNavService';
import { analyseHolding } from '../services/markets/AiAnalysisService';
import { refreshNewsForHoldings, getAllNews } from '../services/markets/NewsService';
import {
  getWatchlist, addToWatchlist, removeFromWatchlist,
  pushRecentSearch, getRecentSearches,
} from '../services/markets/MarketsDB';
import { usePortfolioStore } from './portfolioStore';

export const useMarketStore = create((set, get) => ({
  news: [],
  watchlist: [],
  recentSearches: [],
  isFetchingPrices: false,
  isFetchingNews: false,
  analyzingSymbols: new Set(),
  lastPriceRefresh: 0,
  lastNewsRefresh: 0,
  online: true,

  init: async () => {
    const [wl, news, recents] = await Promise.all([getWatchlist(), getAllNews(), getRecentSearches()]);
    set({ watchlist: wl, news, recentSearches: recents });
  },

  // ── Prices ───────────────────────────────────────────────────────────
  refreshAllPrices: async (holdings) => {
    if (!holdings || !holdings.length) return;
    set({ isFetchingPrices: true });
    const portfolio = usePortfolioStore.getState();
    try {
      for (const h of holdings) {
        try {
          const price = h.type === 'MF'
            ? await fetchMFNav(h.symbol)
            : await fetchStockPrice(h.symbol);
          portfolio.setPrice(h.symbol, price);
        } catch {
          // graceful per-holding failure
        }
      }
      set({ isFetchingPrices: false, lastPriceRefresh: Date.now(), online: true });
    } catch (e) {
      set({ isFetchingPrices: false, online: false });
    }
  },

  refreshPriceFor: async (h) => {
    try {
      const price = h.type === 'MF' ? await fetchMFNav(h.symbol, { force: true }) : await fetchStockPrice(h.symbol, { force: true });
      usePortfolioStore.getState().setPrice(h.symbol, price);
      return price;
    } catch {
      return null;
    }
  },

  // ── News ─────────────────────────────────────────────────────────────
  refreshNews: async (holdings) => {
    set({ isFetchingNews: true });
    try {
      const next = await refreshNewsForHoldings(holdings || []);
      set({ news: next, isFetchingNews: false, lastNewsRefresh: Date.now(), online: true });
    } catch {
      set({ isFetchingNews: false, online: false });
    }
  },

  loadCachedNews: async () => {
    const news = await getAllNews();
    set({ news });
  },

  // ── AI ───────────────────────────────────────────────────────────────
  analyzeHolding: async (holding) => {
    const portfolio = usePortfolioStore.getState();
    const priceObj = portfolio.prices[holding.symbol];
    set((s) => {
      const next = new Set(s.analyzingSymbols); next.add(holding.symbol);
      return { analyzingSymbols: next };
    });
    try {
      const analysis = await analyseHolding({ holding, currentPrice: priceObj?.currentPrice });
      portfolio.setAnalysis(holding.symbol, analysis);
      return analysis;
    } finally {
      set((s) => {
        const next = new Set(s.analyzingSymbols); next.delete(holding.symbol);
        return { analyzingSymbols: next };
      });
    }
  },

  analyzeAll: async (holdings) => {
    for (const h of holdings) {
      await get().analyzeHolding(h);
    }
  },

  // ── Watchlist ────────────────────────────────────────────────────────
  addWatch: async (item) => {
    const next = await addToWatchlist(item);
    set({ watchlist: next });
  },
  removeWatch: async (symbol) => {
    const next = await removeFromWatchlist(symbol);
    set({ watchlist: next });
  },

  // ── Search history ───────────────────────────────────────────────────
  noteSearch: async (q) => {
    await pushRecentSearch(q);
    const list = await getRecentSearches();
    set({ recentSearches: list });
  },

  setOnline: (b) => set({ online: !!b }),
}));
