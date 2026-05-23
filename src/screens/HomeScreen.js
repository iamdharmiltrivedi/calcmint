import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, StatusBar, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { CALCULATORS, CALC_GROUPS, searchCalculators } from '../constants/calculatorData';
import AdBanner from '../components/AdBanner';
import BrandHeader from '../components/BrandHeader';
import StorageService from '../services/StorageService';
import EmptyState from '../components/ui/EmptyState';

export default function HomeScreen({ navigation }) {
  const [query, setQuery] = useState('');
  const [lastCalc, setLastCalc] = useState(null);

  useEffect(() => {
    const focus = navigation.addListener('focus', async () => {
      const last = await StorageService.getLastCalculator();
      setLastCalc(last);
    });
    return focus;
  }, [navigation]);

  const filtered = useMemo(() => searchCalculators(query), [query]);
  const grouped  = useMemo(() => {
    return CALC_GROUPS.map((g) => ({
      ...g,
      items: filtered.filter((c) => c.group === g.id),
    })).filter((g) => g.items.length > 0);
  }, [filtered]);

  const lastCalcMeta = lastCalc ? CALCULATORS.find((c) => c.id === lastCalc.id) : null;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      <BrandHeader />

      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.pageTitle}>Tools</Text>
        <Text style={styles.pageSub}>{CALCULATORS.length} calculators · works offline</Text>

        {/* Continue where you left off — prominent */}
        {lastCalcMeta && (
          <TouchableOpacity
            style={styles.continueCard}
            activeOpacity={0.85}
            onPress={() => navigation.navigate(lastCalcMeta.screen)}
          >
            <View style={[styles.continueIcon, { backgroundColor: lastCalcMeta.softColor }]}>
              <Ionicons name={lastCalcMeta.icon} size={20} color={lastCalcMeta.color} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.continueLabel}>CONTINUE WHERE YOU LEFT</Text>
              <Text style={styles.continueTitle} numberOfLines={1}>{lastCalcMeta.title}</Text>
              <Text style={styles.continueDesc} numberOfLines={1}>{lastCalcMeta.description}</Text>
            </View>
            <View style={styles.continueArrow}>
              <Ionicons name="arrow-forward" size={15} color="#fff" />
            </View>
          </TouchableOpacity>
        )}

        {/* Natural language search */}
        <View style={styles.searchBox}>
          <Ionicons name="sparkles-outline" size={15} color={COLORS.primary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="e.g. how much EMI for ₹50L loan?"
            placeholderTextColor={COLORS.faint}
            style={styles.searchInput}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={16} color={COLORS.subtext} />
            </TouchableOpacity>
          )}
        </View>

        {/* Grouped grid */}
        {grouped.length === 0 ? (
          <EmptyState
            icon="search"
            title="No calculators found"
            message="Try a different keyword like “tax”, “SIP”, or “loan”."
            ctaLabel="Clear search"
            onCtaPress={() => setQuery('')}
          />
        ) : (
          grouped.map((g) => (
            <View key={g.id} style={{ marginTop: 22 }}>
              <Text style={styles.sectionLabel}>{g.title}</Text>
              <View style={styles.grid}>
                {g.items.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={styles.tile}
                    activeOpacity={0.85}
                    onPress={() => navigation.navigate(c.screen)}
                  >
                    <View style={[styles.tileIcon, { backgroundColor: c.softColor || (c.color + '20') }]}>
                      <Ionicons name={c.icon} size={20} color={c.color} />
                    </View>
                    <Text style={styles.tileTitle} numberOfLines={1}>{c.title}</Text>
                    <Text style={styles.tileDesc} numberOfLines={2}>{c.description}</Text>
                  </TouchableOpacity>
                ))}
                {/* fill last row if odd number of items */}
                {g.items.length % 2 === 1 && <View style={[styles.tile, styles.tileFiller]} />}
              </View>
            </View>
          ))
        )}

        <AdBanner style={{ marginTop: 22 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  body: { padding: 18, paddingBottom: 28 },

  pageTitle: { fontSize: 24, fontWeight: '800', color: COLORS.text, letterSpacing: -0.4 },
  pageSub:   { fontSize: 12, color: COLORS.subtext, fontWeight: '600', marginTop: 4, marginBottom: 16 },

  // Continue strip — prominent
  continueCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.card, borderRadius: 12, padding: 14,
    borderWidth: 0.5, borderColor: COLORS.hairline,
    marginBottom: 14, ...COLORS.shadowSoft,
  },
  continueIcon:  { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  continueLabel: { fontSize: 9.5, color: COLORS.subtext, fontWeight: '800', letterSpacing: 0.6 },
  continueTitle: { fontSize: 14.5, fontWeight: '800', color: COLORS.text, marginTop: 2 },
  continueDesc:  { fontSize: 11, color: COLORS.subtext, marginTop: 1 },
  continueArrow: { width: 32, height: 32, borderRadius: 10, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },

  // NL search
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: COLORS.card, borderRadius: 12, paddingHorizontal: 14, height: 48,
    borderWidth: 0.5, borderColor: COLORS.hairline,
  },
  searchInput: { flex: 1, fontSize: 13.5, color: COLORS.text, fontWeight: '600' },

  // Section label per spec: 11px upper, 0.06em tracking, #888
  sectionLabel: {
    fontSize: 11, fontWeight: '800', color: '#888888',
    letterSpacing: 0.66, textTransform: 'uppercase', marginBottom: 10,
  },

  // 2-col grid — tiles include name AND description
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: {
    width: '48.5%',
    backgroundColor: COLORS.card, borderRadius: 12, padding: 16,
    borderWidth: 0.5, borderColor: COLORS.hairline,
    minHeight: 110,
  },
  tileFiller: { backgroundColor: 'transparent', borderWidth: 0, padding: 0, minHeight: 0 },
  tileIcon: {
    width: 38, height: 38, borderRadius: 11,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 10,
  },
  tileTitle: { fontSize: 13.5, fontWeight: '800', color: COLORS.text },
  tileDesc:  { fontSize: 11.5, color: COLORS.subtext, marginTop: 3, lineHeight: 15 },
});
