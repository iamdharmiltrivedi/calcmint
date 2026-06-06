import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { usePortfolioStore } from '../../store/portfolioStore';
import { useMarketStore } from '../../store/marketStore';
import { searchMutualFunds, fetchMFNav } from '../../services/markets/MFNavService';
import { useStockSearch } from '../../hooks/markets/useStockSearch';
import { useStockQuote } from '../../hooks/markets/useStockQuote';
import PrimaryButton from '../../components/PrimaryButton';

// Strip Yahoo's exchange suffix so the holding's stored symbol matches
// what the rest of the app expects (e.g. "RELIANCE", not "RELIANCE.NS").
const stripSuffix = (sym) => String(sym || '').replace(/\.(NS|BO)$/i, '');
const toYahooSymbol = (base, exch) => `${base}.${exch === 'BSE' ? 'BO' : 'NS'}`;

const TYPES = [
  { key: 'Stock', label: 'Stock' },
  { key: 'MF',    label: 'Mutual Fund' },
];
export default function AddEditStockScreen({ route, navigation }) {
  const { holdingId, prefillSymbol } = route.params || {};
  const editing = !!holdingId;

  const holdings = usePortfolioStore((s) => s.holdings);
  const add      = usePortfolioStore((s) => s.add);
  const edit     = usePortfolioStore((s) => s.edit);
  const addWatch = useMarketStore((s) => s.addWatch);

  const existing = holdings.find((h) => h.id === holdingId);

  const [name, setName]         = useState(existing?.name || '');
  const [symbol, setSymbol]     = useState(existing?.symbol || prefillSymbol || '');
  const [quantity, setQuantity] = useState(existing ? String(existing.quantity) : '');
  const [buyPrice, setBuyPrice] = useState(existing ? String(existing.buyPrice) : '');
  const [type, setType]         = useState(existing?.type || 'Stock');
  const [exchange, setExchange] = useState(existing?.exchange || 'NSE');
  const [saving, setSaving]     = useState(false);

  // MF search state
  const [mfQuery, setMfQuery]       = useState('');
  const [mfResults, setMfResults]   = useState([]);
  const [mfSearching, setMfSearching] = useState(false);
  const [mfSelected, setMfSelected] = useState(
    existing?.type === 'MF'
      ? { schemeCode: existing.symbol, schemeName: existing.name }
      : null,
  );
  const [mfNav, setMfNav]           = useState(null);
  const [mfNavLoading, setMfNavLoading] = useState(false);
  const searchTimer = useRef(null);
  // Track whether the user has manually edited the buy price so we don't
  // clobber their input when the NAV / quote resolves a moment later.
  const buyPriceTouched = useRef(!!existing);

  // Stock search state — mirrors the MF picker, backed by Yahoo Finance.
  const [stockQuery, setStockQuery] = useState(prefillSymbol || '');
  const [stockExchange, setStockExchange] = useState('all'); // 'all' | 'NSE' | 'BSE'
  const [stockSelected, setStockSelected] = useState(
    existing?.type === 'Stock'
      ? {
          symbol: toYahooSymbol(existing.symbol, existing.exchange || 'NSE'),
          name: existing.name,
          exchange: existing.exchange || 'NSE',
        }
      : null,
  );
  const {
    results: stockResultsRaw,
    loading: stockSearching,
    error: stockSearchError,
    hasMinChars: stockHasMin,
  } = useStockSearch(stockSelected ? '' : stockQuery);
  const stockResults = useMemo(
    () => (stockExchange === 'all'
      ? stockResultsRaw
      : stockResultsRaw.filter((r) => r.exchange === stockExchange)),
    [stockResultsRaw, stockExchange],
  );
  const { quote: stockQuote, loading: stockQuoteLoading } = useStockQuote(
    type === 'Stock' && stockSelected ? stockSelected.symbol : null,
  );

  useEffect(() => {
    if (editing && existing) {
      setName(existing.name);
      setSymbol(existing.symbol);
      setQuantity(String(existing.quantity));
      setBuyPrice(String(existing.buyPrice));
      setType(existing.type);
      setExchange(existing.exchange || 'NSE');
      if (existing.type === 'MF') {
        setMfSelected({ schemeCode: existing.symbol, schemeName: existing.name });
      }
    }
  }, [editing, existing]);

  // Debounced fund search
  useEffect(() => {
    if (type !== 'MF' || mfSelected) {
      setMfResults([]);
      return;
    }
    const q = mfQuery.trim();
    if (q.length < 2) {
      setMfResults([]);
      setMfSearching(false);
      return;
    }
    if (searchTimer.current) clearTimeout(searchTimer.current);
    setMfSearching(true);
    searchTimer.current = setTimeout(async () => {
      const list = await searchMutualFunds(q);
      setMfResults(list);
      setMfSearching(false);
    }, 280);
    return () => searchTimer.current && clearTimeout(searchTimer.current);
  }, [mfQuery, type, mfSelected]);

  // Pull latest NAV whenever a fund is selected
  useEffect(() => {
    if (type !== 'MF' || !mfSelected?.schemeCode) {
      setMfNav(null);
      return;
    }
    let cancelled = false;
    setMfNavLoading(true);
    fetchMFNav(String(mfSelected.schemeCode))
      .then((p) => {
        if (cancelled) return;
        setMfNav(p);
        if (p?.currentPrice && !buyPriceTouched.current) {
          setBuyPrice(String(p.currentPrice));
        }
      })
      .catch(() => { if (!cancelled) setMfNav(null); })
      .finally(() => { if (!cancelled) setMfNavLoading(false); });
    return () => { cancelled = true; };
  }, [type, mfSelected]);

  const pickFund = (fund) => {
    const code = String(fund.schemeCode);
    setMfSelected({ schemeCode: code, schemeName: fund.schemeName });
    setName(fund.schemeName);
    setSymbol(code);
    setMfQuery('');
    setMfResults([]);
    // Fresh fund → re-arm auto-fill so the incoming NAV populates buy price.
    buyPriceTouched.current = false;
    setBuyPrice('');
  };

  const clearFund = () => {
    setMfSelected(null);
    setMfNav(null);
    setName('');
    setSymbol('');
    buyPriceTouched.current = false;
    setBuyPrice('');
  };

  const useNavAsBuyPrice = () => {
    if (mfNav?.currentPrice) {
      setBuyPrice(String(mfNav.currentPrice));
      buyPriceTouched.current = true;
    }
  };

  // Auto-fill buy price with the latest Yahoo quote when a stock is picked.
  useEffect(() => {
    if (type !== 'Stock') return;
    if (!stockQuote?.currentPrice) return;
    if (buyPriceTouched.current) return;
    setBuyPrice(String(stockQuote.currentPrice));
  }, [type, stockQuote]);

  const pickStock = (item) => {
    const base = stripSuffix(item.symbol);
    setStockSelected(item);
    setName(item.name);
    setSymbol(base);
    setExchange(item.exchange);
    setStockQuery('');
    buyPriceTouched.current = false;
    setBuyPrice('');
  };

  const clearStock = () => {
    setStockSelected(null);
    setName('');
    setSymbol('');
    setExchange('NSE');
    buyPriceTouched.current = false;
    setBuyPrice('');
  };

  const useQuoteAsBuyPrice = () => {
    if (stockQuote?.currentPrice) {
      setBuyPrice(String(stockQuote.currentPrice));
      buyPriceTouched.current = true;
    }
  };

  const onSave = async () => {
    if (type === 'MF' && !mfSelected) {
      return Alert.alert('Select a fund', 'Search and pick a mutual fund first.');
    }
    if (type === 'Stock' && !stockSelected) {
      return Alert.alert('Select a stock', 'Search and pick a stock first.');
    }
    if (!name.trim() || !symbol.trim()) return Alert.alert('Missing fields', 'Name and symbol are required.');
    const qty = parseFloat(quantity) || 0;
    const bp  = parseFloat(buyPrice) || 0;
    if (qty <= 0 || bp <= 0) return Alert.alert('Invalid numbers', 'Quantity and buy price must be positive.');
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        symbol: type === 'MF' ? String(symbol).trim() : symbol.trim().toUpperCase(),
        quantity: qty, buyPrice: bp, type,
        exchange: type === 'Stock' ? exchange : undefined,
      };
      if (editing) await edit({ ...existing, ...payload });
      else         await add(payload);
      navigation.goBack();
    } finally {
      setSaving(false);
    }
  };

  const onAddToWatchlist = async () => {
    if (type === 'MF' && !mfSelected) {
      return Alert.alert('Select a fund', 'Search and pick a mutual fund first.');
    }
    if (type === 'Stock' && !stockSelected) {
      return Alert.alert('Select a stock', 'Search and pick a stock first.');
    }
    if (!name.trim() || !symbol.trim()) return Alert.alert('Missing fields', 'Name and symbol are required.');
    await addWatch({
      name: name.trim(),
      symbol: type === 'MF' ? String(symbol).trim() : symbol.trim().toUpperCase(),
      type,
      exchange: type === 'Stock' ? exchange : undefined,
    });
    Alert.alert('Added to watchlist', `${name.trim()} is on your watchlist.`);
  };

  const navText = useMemo(() => {
    if (!mfNav?.currentPrice) return null;
    return `₹${mfNav.currentPrice.toFixed(4)}`;
  }, [mfNav]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.headerIcon} onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{editing ? 'Edit holding' : 'Add to portfolio'}</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {/* Type toggle */}
        <Text style={styles.label}>Asset type</Text>
        <View style={styles.segment}>
          {TYPES.map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[styles.segItem, type === t.key && styles.segItemActive]}
              onPress={() => {
                setType(t.key);
                // Reset fund selection when switching away from MF
                if (t.key !== 'MF') {
                  setMfSelected(null);
                  setMfQuery('');
                  setMfResults([]);
                }
                // Reset stock selection when switching away from Stock
                if (t.key !== 'Stock') {
                  setStockSelected(null);
                  setStockQuery('');
                }
              }}
              activeOpacity={0.85}
            >
              <Text style={[styles.segText, type === t.key && styles.segTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Stock — search-and-select via Yahoo Finance */}
        {type === 'Stock' && (
          <>
            {stockSelected ? (
              <View style={styles.selectedCard}>
                <View style={styles.selectedIcon}>
                  <Ionicons name="stats-chart-outline" size={18} color={COLORS.primary} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.selectedName} numberOfLines={2}>{stockSelected.name}</Text>
                  <Text style={styles.selectedMeta}>
                    {stripSuffix(stockSelected.symbol)} · {stockSelected.exchange}
                    {stockQuoteLoading
                      ? ' · price…'
                      : stockQuote?.currentPrice
                        ? ` · ₹${stockQuote.currentPrice.toFixed(2)}`
                        : ''}
                  </Text>
                </View>
                <TouchableOpacity onPress={clearStock} style={styles.changeBtn} activeOpacity={0.85}>
                  <Text style={styles.changeText}>Change</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Text style={styles.label}>Search stock</Text>
                <View style={styles.searchWrap}>
                  <Ionicons name="search" size={16} color={COLORS.subtext} style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="e.g. Reliance, HDFC, TCS, INFY"
                    placeholderTextColor={COLORS.faint}
                    value={stockQuery}
                    onChangeText={setStockQuery}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  {stockSearching ? <ActivityIndicator size="small" color={COLORS.primary} /> : null}
                </View>

                {/* Exchange filter chips */}
                {stockHasMin && stockResultsRaw.length > 0 && (
                  <View style={styles.chipRow}>
                    {[
                      { key: 'all', label: 'All',  count: stockResultsRaw.length },
                      { key: 'NSE', label: 'NSE',  count: stockResultsRaw.filter((r) => r.exchange === 'NSE').length },
                      { key: 'BSE', label: 'BSE',  count: stockResultsRaw.filter((r) => r.exchange === 'BSE').length },
                    ].map((c) => {
                      const active = stockExchange === c.key;
                      return (
                        <TouchableOpacity
                          key={c.key}
                          onPress={() => setStockExchange(c.key)}
                          style={[styles.chip, active && styles.chipActive]}
                          activeOpacity={0.85}
                        >
                          <Text style={[styles.chipText, active && styles.chipTextActive]}>
                            {c.label} <Text style={[styles.chipCount, active && styles.chipCountActive]}>{c.count}</Text>
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}

                {stockSearchError ? (
                  <Text style={styles.emptyHint}>{stockSearchError}</Text>
                ) : null}
                {!stockHasMin && !stockSearchError ? (
                  <Text style={styles.emptyHint}>Type 2+ characters to search NSE & BSE.</Text>
                ) : null}
                {stockHasMin && !stockSearching && !stockSearchError && stockResultsRaw.length === 0 ? (
                  <Text style={styles.emptyHint}>No matches. Try the company name or ticker.</Text>
                ) : null}
                {stockHasMin && !stockSearching && stockResultsRaw.length > 0 && stockResults.length === 0 ? (
                  <Text style={styles.emptyHint}>
                    No {stockExchange} matches — tap “All” to widen the filter.
                  </Text>
                ) : null}

                {stockResults.length > 0 && (
                  <View style={styles.resultList}>
                    {stockResults.slice(0, 12).map((r) => (
                      <TouchableOpacity
                        key={`${r.exchange}:${r.symbol}`}
                        style={styles.resultRow}
                        onPress={() => pickStock(r)}
                        activeOpacity={0.85}
                      >
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={styles.resultName} numberOfLines={2}>{r.name}</Text>
                          <Text style={styles.resultMeta}>{r.symbol}</Text>
                        </View>
                        <View style={[styles.exBadge, r.exchange === 'NSE' ? styles.exNse : styles.exBse]}>
                          <Text style={[styles.exBadgeText, r.exchange === 'NSE' ? styles.exNseText : styles.exBseText]}>
                            {r.exchange}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </>
            )}
          </>
        )}

        {/* MF — search-and-select */}
        {type === 'MF' && (
          <>
            {mfSelected ? (
              <View style={styles.selectedCard}>
                <View style={styles.selectedIcon}>
                  <Ionicons name="trending-up" size={18} color={COLORS.primary} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.selectedName} numberOfLines={2}>{mfSelected.schemeName}</Text>
                  <Text style={styles.selectedMeta}>
                    Scheme {mfSelected.schemeCode}
                    {mfNavLoading
                      ? ' · NAV…'
                      : navText
                        ? ` · NAV ${navText}`
                        : ''}
                  </Text>
                </View>
                <TouchableOpacity onPress={clearFund} style={styles.changeBtn} activeOpacity={0.85}>
                  <Text style={styles.changeText}>Change</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Text style={styles.label}>Search mutual fund</Text>
                <View style={styles.searchWrap}>
                  <Ionicons name="search" size={16} color={COLORS.subtext} style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="e.g. HDFC Top 100, Parag Parikh Flexi…"
                    placeholderTextColor={COLORS.faint}
                    value={mfQuery}
                    onChangeText={setMfQuery}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  {mfSearching ? <ActivityIndicator size="small" color={COLORS.primary} /> : null}
                </View>

                {mfQuery.trim().length >= 2 && !mfSearching && mfResults.length === 0 ? (
                  <Text style={styles.emptyHint}>No matches. Try the AMC or fund family name.</Text>
                ) : null}

                {mfResults.length > 0 && (
                  <View style={styles.resultList}>
                    {mfResults.slice(0, 12).map((r) => (
                      <TouchableOpacity
                        key={r.schemeCode}
                        style={styles.resultRow}
                        onPress={() => pickFund(r)}
                        activeOpacity={0.85}
                      >
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={styles.resultName} numberOfLines={2}>{r.schemeName}</Text>
                          <Text style={styles.resultMeta}>Scheme {r.schemeCode}</Text>
                        </View>
                        <Ionicons name="add-circle-outline" size={20} color={COLORS.primary} />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </>
            )}
          </>
        )}

        <Field label="Quantity / Units" value={quantity} onChangeText={setQuantity} placeholder="10" keyboardType="decimal-pad" />
        <Field
          label="Avg buy price (₹)"
          value={buyPrice}
          onChangeText={(v) => { buyPriceTouched.current = true; setBuyPrice(v); }}
          placeholder={
            type === 'MF' && navText
              ? `Latest NAV ${navText}`
              : type === 'Stock' && stockQuote?.currentPrice
                ? `Latest ₹${stockQuote.currentPrice.toFixed(2)}`
                : '1500'
          }
          keyboardType="decimal-pad"
        />

        {type === 'MF' && mfSelected && navText ? (
          <TouchableOpacity onPress={useNavAsBuyPrice} style={styles.navBtn} activeOpacity={0.85}>
            <Ionicons name="flash-outline" size={14} color={COLORS.primary} />
            <Text style={styles.navBtnText}>Use latest NAV as buy price</Text>
          </TouchableOpacity>
        ) : null}

        {type === 'Stock' && stockSelected && stockQuote?.currentPrice ? (
          <TouchableOpacity onPress={useQuoteAsBuyPrice} style={styles.navBtn} activeOpacity={0.85}>
            <Ionicons name="flash-outline" size={14} color={COLORS.primary} />
            <Text style={styles.navBtnText}>Use latest price as buy price</Text>
          </TouchableOpacity>
        ) : null}

        <PrimaryButton
          title={editing ? 'Save changes' : 'Add to portfolio'}
          onPress={onSave}
          loading={saving}
          variant="gradient"
          style={{ marginTop: 24 }}
        />

        {!editing && (
          <TouchableOpacity style={styles.watchBtn} onPress={onAddToWatchlist} activeOpacity={0.85}>
            <Ionicons name="star-outline" size={16} color={COLORS.primary} />
            <Text style={styles.watchText}>Just add to watchlist</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({ label, ...input }) {
  return (
    <View style={{ marginTop: 14 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        placeholderTextColor={COLORS.faint}
        {...input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  body: { padding: 18, paddingBottom: 40 },

  headerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 6 },
  headerIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text, letterSpacing: -0.2 },

  label: { fontSize: 11.5, color: COLORS.subtext, fontWeight: '800', letterSpacing: 0.2, marginBottom: 6, marginTop: 14 },
  input: {
    backgroundColor: COLORS.card, borderRadius: 12, padding: 14, fontSize: 14,
    color: COLORS.text, borderWidth: 1, borderColor: COLORS.border, fontWeight: '600',
  },
  segment: {
    flexDirection: 'row', backgroundColor: COLORS.card, borderRadius: 12, padding: 4,
    borderWidth: 1, borderColor: COLORS.border,
  },
  segItem: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 9 },
  segItemActive: { backgroundColor: COLORS.primary },
  segText: { fontSize: 12, fontWeight: '800', color: COLORS.subtext },
  segTextActive: { color: '#fff' },

  // MF search
  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.card, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: COLORS.border,
  },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.text, fontWeight: '600', padding: 0 },
  emptyHint: { fontSize: 12, color: COLORS.subtext, marginTop: 10, paddingHorizontal: 4 },
  resultList: {
    marginTop: 8, backgroundColor: COLORS.card, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden',
  },
  resultRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 12, borderBottomWidth: 0.5, borderBottomColor: COLORS.hairline,
  },
  resultName: { fontSize: 13, color: COLORS.text, fontWeight: '700' },
  resultMeta: { fontSize: 11, color: COLORS.subtext, marginTop: 2, fontWeight: '600' },

  // Exchange badge — used in stock search results / selected card
  exBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  exNse:   { backgroundColor: COLORS.primarySoft },
  exBse:   { backgroundColor: COLORS.goldSoft },
  exBadgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.4 },
  exNseText: { color: COLORS.primary },
  exBseText: { color: COLORS.gold },

  // Exchange filter chips above the stock results list
  chipRow: { flexDirection: 'row', gap: 6, marginTop: 10 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999,
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border,
  },
  chipActive:     { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText:       { fontSize: 11.5, fontWeight: '800', color: COLORS.subtext },
  chipTextActive: { color: '#fff' },
  chipCount:      { fontSize: 11, fontWeight: '700', color: COLORS.faint },
  chipCountActive:{ color: 'rgba(255,255,255,0.8)' },

  selectedCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.primarySoft, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: COLORS.primary + '40', marginTop: 6,
  },
  selectedIcon: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },
  selectedName: { fontSize: 13.5, color: COLORS.text, fontWeight: '800' },
  selectedMeta: { fontSize: 11, color: COLORS.subtext, marginTop: 3, fontWeight: '600' },
  changeBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: '#fff' },
  changeText: { fontSize: 11.5, color: COLORS.primary, fontWeight: '800' },

  navBtn: {
    marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 6, alignSelf: 'flex-start',
  },
  navBtnText: { color: COLORS.primary, fontWeight: '800', fontSize: 12 },

  watchBtn: {
    marginTop: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6,
    padding: 14, borderRadius: 14, backgroundColor: COLORS.primarySoft,
  },
  watchText: { color: COLORS.primary, fontWeight: '800', fontSize: 13 },
});
