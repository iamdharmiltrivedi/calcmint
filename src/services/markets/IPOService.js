// IPO calendar — backed by the IPO Alerts API (https://ipoalerts.in/docs).
//
// Auth: GET https://api.ipoalerts.in/ipos with header `x-api-key: <key>`.
// We expose the key via `EXPO_PUBLIC_IPO_ALERTS_API_KEY` (recommended) or
// fall back to the constant below so a developer can paste it in. If no
// key is present we surface a clear error instead of silently mocking.
//
// The API returns `{ meta: { count }, ipos: [...] }`. We normalise each
// row into the internal shape consumed by IPOTrackerScreen so the rest
// of the app doesn't need to know what backend powers it.
import axios from 'axios';
import { SL_TTL } from '../../constants/storageKeys';
import { getCachedIPOs, setCachedIPOs } from './MarketsDB';

const API_BASE = 'https://api.ipoalerts.in';
const LOG = '[IPOService]';

// Paste your key here OR set EXPO_PUBLIC_IPO_ALERTS_API_KEY in .env / app config.
const FALLBACK_KEY = '';

const getApiKey = () =>
  (process.env.EXPO_PUBLIC_IPO_ALERTS_API_KEY || FALLBACK_KEY || '').trim();

const maskKey = (k) => {
  if (!k) return '(empty)';
  if (k.length <= 8) return `${k.slice(0, 2)}…(len=${k.length})`;
  return `${k.slice(0, 4)}…${k.slice(-4)} (len=${k.length})`;
};

const ax = axios.create({
  baseURL: API_BASE,
  timeout: 12000,
  headers: { 'Content-Type': 'application/json' },
});

// One-shot startup diagnostic so the console shows whether Metro inlined
// the env var. If this prints "(empty)" you need to restart Metro with
// `npx expo start --dev-client -c` after editing .env.
console.log(
  `${LOG} module loaded — base=${API_BASE} key=${maskKey(getApiKey())}`,
);

// ── Field normalisation ──────────────────────────────────────────────────
const toIsoDate = (v) => {
  if (!v) return undefined;
  if (typeof v === 'string') {
    // Already ISO-ish? Trust the YYYY-MM-DD prefix.
    if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    return undefined;
  }
  if (typeof v === 'number') {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? undefined : d.toISOString().slice(0, 10);
  }
  return undefined;
};

const toNumber = (v) => {
  if (v === null || v === undefined || v === '') return undefined;
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[^\d.\-]/g, ''));
  return Number.isFinite(n) ? n : undefined;
};

// "₹542-570" / "542 - 570" / "542" / "542 to 570" → { min, max }
const parsePriceRange = (str) => {
  if (!str || typeof str !== 'string') return {};
  const nums = str.match(/\d+(?:\.\d+)?/g);
  if (!nums || !nums.length) return {};
  const min = parseFloat(nums[0]);
  const max = nums.length > 1 ? parseFloat(nums[1]) : min;
  return {
    priceMin: Number.isFinite(min) ? min : undefined,
    priceMax: Number.isFinite(max) ? max : undefined,
  };
};

const normaliseStatus = (raw, openDate, closeDate, listingDate) => {
  const s = String(raw || '').toLowerCase();
  if (s === 'open' || s === 'live') return 'active';
  if (s === 'closing' || s === 'closed' || s === 'allotment') return 'closed';
  if (s === 'listed') return 'listed';
  if (s === 'upcoming' || s === 'announced') return 'upcoming';
  // Derive when the API doesn't tell us.
  const today = new Date().toISOString().slice(0, 10);
  if (listingDate && listingDate <= today) return 'listed';
  if (openDate && closeDate) {
    if (openDate > today) return 'upcoming';
    if (closeDate < today) return 'closed';
    return 'active';
  }
  return s || 'upcoming';
};

// `gmp` per the docs is `{ aggregations, sources }`. We look for a numeric
// value in a few likely places — the docs don't pin the inner shape so we
// stay defensive.
const parseGmp = (raw) => {
  if (raw == null) return undefined;
  if (typeof raw === 'number') return raw;
  if (typeof raw === 'string') return toNumber(raw);
  if (typeof raw === 'object') {
    const candidates = [
      raw.value, raw.latest, raw.current, raw.amount,
      raw.aggregations?.latest, raw.aggregations?.current,
      raw.aggregations?.average, raw.aggregations?.avg,
      raw.aggregations?.value,
      Array.isArray(raw.sources) ? raw.sources[0]?.value : undefined,
      Array.isArray(raw.sources) ? raw.sources[0]?.gmp   : undefined,
    ];
    for (const c of candidates) {
      const n = toNumber(c);
      if (n !== undefined) return n;
    }
  }
  return undefined;
};

const normaliseIPO = (raw) => {
  if (!raw || typeof raw !== 'object') return null;
  // Per ipoalerts.in: timeline fields are startDate / endDate / listingDate.
  const openDate    = toIsoDate(raw.startDate ?? raw.openDate    ?? raw.open_date    ?? raw.subscriptionStart);
  const closeDate   = toIsoDate(raw.endDate   ?? raw.closeDate   ?? raw.close_date   ?? raw.subscriptionEnd);
  const listingDate = toIsoDate(raw.listingDate ?? raw.listing_date);

  const pricePair = parsePriceRange(raw.priceRange ?? raw.price_range ?? raw.priceBand ?? '');
  const priceMin  = toNumber(raw.priceMin) ?? toNumber(raw.minPrice) ?? pricePair.priceMin;
  const priceMax  = toNumber(raw.priceMax) ?? toNumber(raw.maxPrice) ?? pricePair.priceMax;

  // Lot size is `minQty` in the IPO Alerts schema.
  const lotSize   = toNumber(raw.minQty ?? raw.lotSize ?? raw.lot_size);
  const minAmount = toNumber(raw.minAmount);

  const id   = raw.id || raw._id || raw.identifier || raw.slug || raw.symbol || raw.name;
  const name = raw.name || raw.companyName || raw.company || raw.symbol || 'Unknown IPO';

  return {
    id:           String(id),
    name:         String(name),
    symbol:       raw.symbol || undefined,
    type:         raw.type   || undefined,
    sector:       raw.sector || raw.industry || '—',
    status:       normaliseStatus(raw.status, openDate, closeDate, listingDate),
    openDate, closeDate, listingDate,
    priceMin, priceMax,
    lotSize,
    minAmount,
    issueSize:     toNumber(raw.issueSize ?? raw.issue_size ?? raw.totalIssueSize),
    gmp:           parseGmp(raw.gmp ?? raw.greyMarketPremium),
    subscription:  toNumber(raw.subscription ?? raw.subscriptionTimes ?? raw.totalSubscription),
    listingPrice:  toNumber(raw.listingPrice ?? raw.listing_price),
    listingGain:   toNumber(raw.listingGain  ?? raw.listing_gain ?? raw.listingGainPercent),
    logo:          raw.logo || undefined,
    about:         raw.about || undefined,
    prospectusUrl: raw.prospectusUrl || undefined,
    infoUrl:       raw.infoUrl || raw.nseInfoUrl || undefined,
  };
};

// ── Network ──────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const requestIPOs = async (params = {}, { allowRetry = true } = {}) => {
  const key = getApiKey();
  console.log(`${LOG} requestIPOs params=${JSON.stringify(params)} key=${maskKey(key)}`);
  if (!key) {
    const err = new Error('IPO Alerts API key not configured');
    err.code = 'NO_KEY';
    throw err;
  }
  const started = Date.now();
  try {
    const res = await ax.get('/ipos', {
      params,
      headers: { 'x-api-key': key },
    });
    const data = res?.data;
    const rateRemaining = res?.headers?.['x-ratelimit-remaining'];
    console.log(
      `${LOG} ✓ ${res.status} in ${Date.now() - started}ms`,
      'count=', data?.meta?.count ?? (Array.isArray(data?.ipos) ? data.ipos.length : 'n/a'),
      'rate-remaining=', rateRemaining ?? 'n/a',
    );
    const rows = Array.isArray(data?.ipos) ? data.ipos : Array.isArray(data) ? data : [];
    if (rows.length === 0) {
      console.log(`${LOG}   response shape:`, JSON.stringify(data).slice(0, 240));
    } else {
      console.log(`${LOG}   first row keys:`, Object.keys(rows[0]).join(','));
    }
    return rows.map(normaliseIPO).filter(Boolean);
  } catch (err) {
    const status = err?.response?.status;
    const body   = err?.response?.data;
    console.warn(
      `${LOG} ✗ params=${JSON.stringify(params)} status=${status ?? 'no-response'} ` +
      `msg=${err?.message} body=${typeof body === 'string' ? body.slice(0, 240) : JSON.stringify(body).slice(0, 240)}`,
    );
    if (status === 429 && allowRetry) {
      const retryAfter = err.response?.headers?.['x-ratelimit-retry-after'];
      const delay = (Number(retryAfter) || 10) * 1000;
      console.log(`${LOG}   429 — sleeping ${delay}ms then retrying once`);
      await sleep(delay);
      return requestIPOs(params, { allowRetry: false });
    }
    throw err;
  }
};

// Strategy: one unfiltered call returns every IPO across statuses. Falls
// back to per-status fan-out only when the API rejects the broad query.
// Per-status fallback uses a small inter-call delay to avoid 429.
const fetchAllStatuses = async () => {
  // 1. Single broad call.
  try {
    const all = await requestIPOs();
    if (all.length) {
      console.log(`${LOG} fetchAllStatuses (broad) returned ${all.length}`);
      return all;
    }
  } catch (e) {
    if (e?.code === 'NO_KEY') throw e;
    // fall through
  }

  // 2. Per-status fan-out.
  const merged = new Map();
  let anySuccess = false;
  let lastError = null;
  const statuses = ['upcoming', 'open', 'closed', 'listed'];
  for (let i = 0; i < statuses.length; i++) {
    try {
      const rows = await requestIPOs({ status: statuses[i] });
      anySuccess = true;
      for (const r of rows) merged.set(r.id, r);
    } catch (e) {
      if (e?.code === 'NO_KEY') throw e;
      lastError = e;
    }
    if (i < statuses.length - 1) await sleep(1200);
  }

  console.log(`${LOG} fetchAllStatuses merged=${merged.size} anySuccess=${anySuccess}`);
  if (!anySuccess && lastError) throw lastError;
  return Array.from(merged.values());
};

// ── Public API ───────────────────────────────────────────────────────────
export const getIPOs = async ({ force = false } = {}) => {
  const cache = await getCachedIPOs();
  const cacheAgeMs = Date.now() - (cache.fetchedAt || 0);
  if (!force && cache.items?.length && cacheAgeMs < SL_TTL.IPO) {
    return cache.items;
  }
  console.log(
    `${LOG} getIPOs force=${force} cached=${cache.items?.length || 0} cacheAgeMs=${cacheAgeMs}`,
  );
  try {
    const items = await fetchAllStatuses();
    if (items.length) {
      await setCachedIPOs({ fetchedAt: Date.now(), items });
      console.log(`${LOG} fetched ${items.length} fresh items, cached`);
      return items;
    }
    console.log(`${LOG} API returned 0 items; keeping stale cache (${cache.items?.length || 0})`);
    return cache.items || [];
  } catch (err) {
    console.warn(`${LOG} getIPOs threw — code=${err?.code} msg=${err?.message}`);
    if (cache.items?.length) return cache.items;
    throw err;
  }
};

export const getActiveIPOs = async ({ force = false } = {}) => {
  const all = await getIPOs({ force });
  const today = new Date().toISOString().slice(0, 10);
  return all.filter(
    (i) => i.status === 'active'
      || (i.openDate && i.closeDate && i.openDate <= today && i.closeDate >= today),
  );
};

export const getIPOById = async (identifier) => {
  const key = getApiKey();
  if (!key) throw Object.assign(new Error('IPO Alerts API key not configured'), { code: 'NO_KEY' });
  const { data } = await ax.get(`/ipos/${encodeURIComponent(identifier)}`, {
    headers: { 'x-api-key': key },
  });
  return normaliseIPO(data?.ipo || data);
};
