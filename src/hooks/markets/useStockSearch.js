import { useEffect, useRef, useState } from 'react';
import { searchStocks } from '../../services/markets/StockService';

const DEBOUNCE_MS = 300;
const MIN_CHARS   = 2;

// Debounced Yahoo Finance stock search (NSE + BSE equities).
// Returns { results, loading, error, hasMinChars, symbolsReady }.
// `symbolsReady` is kept for backwards compatibility with the previous
// catalogue-based hook — always true now since we hit the API live.
export function useStockSearch(query) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const debounceTimer = useRef(null);
  const reqId         = useRef(0);

  const trimmed     = (query || '').trim();
  const hasMinChars = trimmed.length >= MIN_CHARS;

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (!hasMinChars) {
      setResults([]); setError(null); setLoading(false);
      return undefined;
    }

    setLoading(true);
    const myId = ++reqId.current;
    debounceTimer.current = setTimeout(async () => {
      try {
        const list = await searchStocks(trimmed);
        if (myId !== reqId.current) return; // stale
        setResults(list);
        setError(null);
      } catch (e) {
        if (myId !== reqId.current) return;
        setError(e?.message || 'Search failed');
        setResults([]);
      } finally {
        if (myId === reqId.current) setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => debounceTimer.current && clearTimeout(debounceTimer.current);
  }, [trimmed, hasMinChars]);

  return {
    results,
    loading,
    error,
    hasMinChars,
    symbolsReady: true,
  };
}
