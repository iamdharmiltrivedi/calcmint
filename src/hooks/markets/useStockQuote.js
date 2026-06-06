import { useCallback, useEffect, useState } from 'react';
import { getQuote } from '../../services/markets/StockService';

// Fetches a Yahoo Finance quote for the given symbol.
// Returns { quote, loading, error, refetch }.
//
// The returned `quote` exposes `currentPrice` / `openPrice` / `dayHigh` /
// `dayLow` / `previousClose` — the field names the screens already read.
export function useStockQuote(symbol) {
  const [quote, setQuote]     = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const load = useCallback(async (force = false) => {
    if (!symbol) { setQuote(null); return; }
    setLoading(true);
    setError(null);
    try {
      const q = await getQuote(symbol, { force });
      setQuote({
        symbol:        q.symbol,
        currentPrice:  q.currentPrice,
        openPrice:     q.open,
        dayHigh:       q.dayHigh,
        dayLow:        q.dayLow,
        previousClose: q.previousClose,
        companyName:   q.companyName,
        currency:      q.currency,
        lastUpdated:   q.lastUpdated,
      });
    } catch (e) {
      setError(e?.message || 'Failed to load quote');
      setQuote(null);
    } finally {
      setLoading(false);
    }
  }, [symbol]);

  useEffect(() => { load(false); }, [load]);

  return { quote, loading, error, refetch: () => load(true) };
}
