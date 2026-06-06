// Namespaced AsyncStorage keys for ported Stock Lens features.
// All Markets data uses the "sl_" prefix to avoid clashing with
// CalcMint's "@fc_" keys. Keep this file as the single source of truth.
export const SL_KEYS = {
  HOLDINGS:        'sl_holdings',
  WATCHLIST:       'sl_watchlist',
  PORTFOLIO_META:  'sl_portfolio_meta',
  PRICE_CACHE:     'sl_price_cache',
  NEWS_CACHE:      'sl_news_cache',
  AI_CACHE:        'sl_ai_cache',
  IPO_CACHE:       'sl_ipo_cache_v3',  // bumped after IPO Alerts schema mapping fix
  ALERTS:          'sl_alerts',
  RECENT_SEARCHES: 'sl_recent_searches',
  SETTINGS:        'sl_settings',
  STOCK_CACHE:     'sl_stock_cache',  // Yahoo: search/quote/profile/history
};

// Cache TTLs (ms)
export const SL_TTL = {
  STOCK_PRICE:   5  * 60 * 1000,         // 5 min — Yahoo quote
  STOCK_SEARCH:  10 * 60 * 1000,         // 10 min — search results
  STOCK_PROFILE: 24 * 60 * 60 * 1000,    // 24 hr — company profile
  STOCK_HISTORY: 60 * 60 * 1000,         // 1 hr  — historical candles
  MF_NAV:        60 * 60 * 1000,         // 1 hr
  NEWS:          2  * 60 * 60 * 1000,    // 2 hr
  AI_ANALYSIS:   6  * 60 * 60 * 1000,    // 6 hr
  IPO:           12 * 60 * 60 * 1000,    // 12 hr
};
