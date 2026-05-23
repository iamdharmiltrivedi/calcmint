// IPO calendar. No free public API gives a reliable Indian IPO feed
// without auth, so we ship a small curated mock dataset and refresh
// it from the cache. Replace `fetchUpstream` with a real source later.
import { SL_TTL } from '../../constants/storageKeys';
import { getCachedIPOs, setCachedIPOs } from './MarketsDB';

const MOCK = () => {
  const today = new Date();
  const iso = (offset) => {
    const d = new Date(today); d.setDate(d.getDate() + offset); return d.toISOString().slice(0, 10);
  };
  return [
    { id: 'ipo_1', name: 'Bharti Hexacom',  status: 'active',   openDate: iso(-1), closeDate: iso(2),  priceMin: 542, priceMax: 570, lotSize: 26, sector: 'Telecom',   issueSize: 4275, gmp: 32,  subscription: 1.8 },
    { id: 'ipo_2', name: 'Indegene Ltd',    status: 'upcoming', openDate: iso(5),  closeDate: iso(8),  priceMin: 430, priceMax: 452, lotSize: 33, sector: 'Healthcare',issueSize: 1842, gmp: 18 },
    { id: 'ipo_3', name: 'Aadhar Housing',  status: 'upcoming', openDate: iso(3),  closeDate: iso(7),  priceMin: 300, priceMax: 315, lotSize: 47, sector: 'Finance',   issueSize: 3000, gmp: 24 },
    { id: 'ipo_4', name: 'TBO Tek',         status: 'closed',   openDate: iso(-7), closeDate: iso(-4), priceMin: 875, priceMax: 920, lotSize: 16, sector: 'Travel',    issueSize: 1550, listingDate: iso(1),  subscription: 86.7 },
    { id: 'ipo_5', name: 'Go Digit',        status: 'listed',   openDate: iso(-20),closeDate: iso(-17),priceMin: 258, priceMax: 272, lotSize: 55, sector: 'Insurance', issueSize: 2614, listingDate: iso(-10), listingPrice: 286, listingGain: 5.1, subscription: 9.6 },
  ];
};

const fetchUpstream = async () => MOCK();

export const getIPOs = async ({ force = false } = {}) => {
  const cache = await getCachedIPOs();
  if (!force && cache.items.length && Date.now() - cache.fetchedAt < SL_TTL.IPO) {
    return cache.items;
  }
  try {
    const items = await fetchUpstream();
    await setCachedIPOs({ fetchedAt: Date.now(), items });
    return items;
  } catch {
    return cache.items;
  }
};

export const getActiveIPOs = async () => {
  const all = await getIPOs();
  const today = new Date().toISOString().slice(0, 10);
  return all.filter((i) => i.status === 'active' || (i.openDate <= today && i.closeDate >= today));
};
