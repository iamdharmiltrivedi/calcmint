import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, MONO_STYLE } from '../../constants/colors';
import { useStockSearch } from '../../hooks/markets/useStockSearch';
import { useStockQuote } from '../../hooks/markets/useStockQuote';

const formatPrice = (n) =>
  typeof n === 'number' && isFinite(n)
    ? `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : '—';

export default function StockSelector({ onSelect }) {
  const [query, setQuery]       = useState('');
  const [selected, setSelected] = useState(null); // { symbol, name, exchange }

  const { results, loading: searching, error: searchError, hasMinChars, symbolsReady } =
    useStockSearch(selected ? '' : query);

  const { quote, loading: quoteLoading, error: quoteError, refetch: refetchQuote } =
    useStockQuote(selected?.symbol);

  const pick = (item) => {
    setSelected(item);
    setQuery('');
    onSelect?.(item);
  };

  const clear = () => {
    setSelected(null);
    setQuery('');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Search stock</Text>

      {/* Input */}
      <View style={styles.inputWrap}>
        <Ionicons name="search" size={16} color={COLORS.subtext} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.input}
          value={selected ? `${selected.name} (${selected.symbol})` : query}
          onChangeText={(v) => { if (selected) setSelected(null); setQuery(v); }}
          placeholder="e.g. Reliance, TCS, HDFC"
          placeholderTextColor={COLORS.faint}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          editable={!selected}
        />
        {searching && !selected ? (
          <ActivityIndicator size="small" color={COLORS.primary} />
        ) : (selected || query.length > 0) ? (
          <TouchableOpacity onPress={clear} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={18} color={COLORS.subtext} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Symbol-list error */}
      {searchError && !selected && (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle" size={14} color={COLORS.negative} />
          <Text style={styles.errorText}>{searchError}</Text>
        </View>
      )}

      {/* Hints */}
      {!selected && !hasMinChars && symbolsReady && (
        <Text style={styles.hint}>Type at least 2 characters to search.</Text>
      )}
      {!selected && hasMinChars && !searching && !searchError && results.length === 0 && (
        <Text style={styles.hint}>No matches. Try a different name or ticker.</Text>
      )}

      {/* Results */}
      {!selected && results.length > 0 && (
        <View style={styles.resultsCard}>
          <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled style={{ maxHeight: 300 }}>
            {results.map((r) => (
              <TouchableOpacity
                key={`${r.exchange}:${r.symbol}`}
                style={styles.resultRow}
                onPress={() => pick(r)}
                activeOpacity={0.85}
              >
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.resultName} numberOfLines={1}>{r.name}</Text>
                  <Text style={styles.resultMeta} numberOfLines={1}>
                    {r.symbol}
                  </Text>
                </View>
                <View style={[styles.exBadge, r.exchange === 'NSE' ? styles.exNse : styles.exBse]}>
                  <Text style={[styles.exBadgeText, r.exchange === 'NSE' ? styles.exNseText : styles.exBseText]}>
                    {r.exchange}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Selected stock + quote */}
      {selected && (
        <View style={styles.selectedCard}>
          <View style={styles.selectedHead}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.selectedName} numberOfLines={2}>{selected.name}</Text>
              <View style={styles.selectedMetaRow}>
                <Text style={styles.selectedSymbol}>{selected.symbol}</Text>
                <View style={[styles.exBadge, selected.exchange === 'NSE' ? styles.exNse : styles.exBse]}>
                  <Text style={[styles.exBadgeText, selected.exchange === 'NSE' ? styles.exNseText : styles.exBseText]}>
                    {selected.exchange}
                  </Text>
                </View>
              </View>
            </View>
            <TouchableOpacity onPress={refetchQuote} style={styles.iconBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              {quoteLoading
                ? <ActivityIndicator size="small" color={COLORS.primary} />
                : <Ionicons name="refresh" size={16} color={COLORS.primary} />}
            </TouchableOpacity>
          </View>

          {quoteError ? (
            <View style={styles.quoteError}>
              <Ionicons name="alert-circle" size={14} color={COLORS.negative} />
              <Text style={styles.errorText}>{quoteError}</Text>
              <TouchableOpacity onPress={refetchQuote} style={styles.retryBtn}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.priceBlock}>
                <Text style={styles.priceLabel}>CURRENT PRICE</Text>
                <Text style={styles.priceValue}>
                  {quoteLoading && !quote ? '—' : formatPrice(quote?.currentPrice)}
                </Text>
              </View>
              <View style={styles.statsGrid}>
                <Stat label="Open"           value={formatPrice(quote?.openPrice)} />
                <Stat label="Day High"       value={formatPrice(quote?.dayHigh)} />
                <Stat label="Day Low"        value={formatPrice(quote?.dayLow)} />
                <Stat label="Previous Close" value={formatPrice(quote?.previousClose)} />
              </View>
            </>
          )}
        </View>
      )}
    </View>
  );
}

function Stat({ label, value }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 4 },
  label: {
    fontSize: 11.5, color: COLORS.subtext, fontWeight: '800',
    letterSpacing: 0.2, marginBottom: 6,
  },

  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.card, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: COLORS.border,
  },
  input: { flex: 1, fontSize: 14, color: COLORS.text, fontWeight: '600', padding: 0 },

  hint: { fontSize: 12, color: COLORS.subtext, marginTop: 10, paddingHorizontal: 4 },
  errorRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, paddingHorizontal: 4,
  },
  errorText: { fontSize: 12, color: COLORS.negative, flex: 1 },

  resultsCard: {
    marginTop: 8, backgroundColor: COLORS.card, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden',
  },
  resultRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 12, borderBottomWidth: 0.5, borderBottomColor: COLORS.hairline,
  },
  resultName: { fontSize: 13, color: COLORS.text, fontWeight: '700' },
  resultMeta: { fontSize: 11, color: COLORS.subtext, marginTop: 2, fontWeight: '600' },

  exBadge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
  },
  exNse:     { backgroundColor: COLORS.primarySoft },
  exNseText: { color: COLORS.primary },
  exBse:     { backgroundColor: COLORS.goldSoft },
  exBseText: { color: COLORS.gold },
  exBadgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.4 },

  selectedCard: {
    marginTop: 12,
    backgroundColor: COLORS.card, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: COLORS.border,
  },
  selectedHead: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12,
  },
  selectedName: { fontSize: 14.5, fontWeight: '800', color: COLORS.text, letterSpacing: -0.2 },
  selectedMetaRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap',
  },
  selectedSymbol: { fontSize: 11.5, color: COLORS.subtext, fontWeight: '700' },
  iconBtn: {
    width: 32, height: 32, borderRadius: 10, backgroundColor: COLORS.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },

  priceBlock: {
    backgroundColor: COLORS.primarySoft, borderRadius: 10, padding: 12, marginBottom: 10,
  },
  priceLabel: { fontSize: 10, fontWeight: '800', color: COLORS.primary, letterSpacing: 0.6 },
  priceValue: { ...MONO_STYLE, fontSize: 22, fontWeight: '800', color: COLORS.primaryDeep, marginTop: 4 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stat: {
    flexGrow: 1, flexBasis: '47%',
    backgroundColor: COLORS.background, borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: COLORS.border,
  },
  statLabel: { fontSize: 10, fontWeight: '800', color: COLORS.subtext, letterSpacing: 0.4, textTransform: 'uppercase' },
  statValue: { ...MONO_STYLE, fontSize: 13, fontWeight: '800', color: COLORS.text, marginTop: 4 },

  quoteError: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.negativeSoft, borderRadius: 10, padding: 10,
  },
  retryBtn: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
    backgroundColor: COLORS.card,
  },
  retryText: { fontSize: 11, color: COLORS.negative, fontWeight: '800' },
});
