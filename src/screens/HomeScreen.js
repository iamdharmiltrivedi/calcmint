import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, StatusBar, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { CALCULATORS } from '../constants/calculatorData';
import CalculatorCard from '../components/CalculatorCard';
import AdBanner from '../components/AdBanner';
import BrandHeader from '../components/BrandHeader';
import StorageService from '../services/StorageService';

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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CALCULATORS;
    return CALCULATORS.filter(
      (c) => c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q),
    );
  }, [query]);

  const lastCalcMeta = lastCalc ? CALCULATORS.find((c) => c.id === lastCalc.id) : null;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      <BrandHeader />

      {/* Page-specific hero — same family as Expenses / Goals headers */}
      <LinearGradient colors={COLORS.gradient} style={styles.header}>
        <View style={styles.headerOrb} />
        <View style={styles.headerRow}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={styles.headerTitle}>Smart Money Tools</Text>
            <Text style={styles.headerSub}>
              {CALCULATORS.length} calculators · Indian formats · works offline
            </Text>
          </View>
          <View style={styles.offlinePill}>
            <View style={styles.offlineDot} />
            <Text style={styles.offlinePillText}>OFFLINE</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Continue strip */}
        {lastCalcMeta && (
          <TouchableOpacity
            style={styles.continueCard}
            activeOpacity={0.85}
            onPress={() => navigation.navigate(lastCalcMeta.screen)}
          >
            <View style={[styles.continueIcon, { backgroundColor: lastCalcMeta.softColor }]}>
              <Ionicons name={lastCalcMeta.icon} size={19} color={lastCalcMeta.color} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.continueLabel}>CONTINUE WHERE YOU LEFT</Text>
              <Text style={styles.continueTitle} numberOfLines={1}>{lastCalcMeta.title}</Text>
            </View>
            <View style={styles.continueArrow}>
              <Ionicons name="arrow-forward" size={15} color="#fff" />
            </View>
          </TouchableOpacity>
        )}

        {/* Search */}
        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color={COLORS.subtext} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search calculators…"
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

        {/* Section header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>All Calculators</Text>
          <Text style={styles.sectionCount}>{filtered.length} tools</Text>
        </View>

        {/* 3-col grid */}
        <View style={styles.grid}>
          {filtered.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🔍</Text>
              <Text style={styles.emptyText}>No calculators found</Text>
              <Text style={styles.emptyHint}>Try a different keyword</Text>
            </View>
          ) : (
            Array.from({ length: Math.ceil(filtered.length / 3) }).map((_, rowIdx) => (
              <View style={styles.row} key={rowIdx}>
                {filtered.slice(rowIdx * 3, rowIdx * 3 + 3).map((c, colIdx) => (
                  <CalculatorCard
                    key={c.id}
                    item={c}
                    index={rowIdx * 3 + colIdx}
                    onPress={() => navigation.navigate(c.screen)}
                  />
                ))}
                {Array.from({
                  length: 3 - filtered.slice(rowIdx * 3, rowIdx * 3 + 3).length,
                }).map((__, i) => (
                  <View key={`filler-${i}`} style={{ flex: 1, margin: 5 }} />
                ))}
              </View>
            ))
          )}
        </View>

        <AdBanner style={{ marginTop: 18 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },

  body: { paddingBottom: 28, paddingTop: 14 },

  // Header — same shape as Expenses / Goals for cross-page consistency
  header: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 20,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    overflow: 'hidden',
    position: 'relative',
  },
  headerOrb: {
    position: 'absolute', right: -50, top: -50,
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: 'rgba(201,162,74,0.22)',
  },
  headerRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff', letterSpacing: -0.3 },
  headerSub: { fontSize: 12.5, color: 'rgba(255,255,255,0.78)', marginTop: 4, lineHeight: 18 },

  offlinePill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(201,162,74,0.20)',
    borderWidth: 1, borderColor: 'rgba(201,162,74,0.45)',
    paddingHorizontal: 9, paddingVertical: 4,
    borderRadius: 999,
  },
  offlineDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: COLORS.gold },
  offlinePillText: { fontSize: 9.5, fontWeight: '700', color: COLORS.gold, letterSpacing: 0.8 },

  // Continue strip
  continueCard: {
    marginHorizontal: 18,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.card, borderRadius: 16, padding: 12,
    borderWidth: 1, borderColor: COLORS.border,
    ...COLORS.shadowSoft,
  },
  continueIcon: {
    width: 40, height: 40, borderRadius: 11,
    justifyContent: 'center', alignItems: 'center',
  },
  continueLabel: {
    fontSize: 9.5, color: COLORS.subtext, fontWeight: '700', letterSpacing: 0.6,
  },
  continueTitle: { fontSize: 13.5, fontWeight: '700', color: COLORS.text, marginTop: 2 },
  continueArrow: {
    width: 32, height: 32, borderRadius: 10, backgroundColor: COLORS.text,
    justifyContent: 'center', alignItems: 'center',
  },

  // Search
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 18, marginTop: 14,
    backgroundColor: COLORS.card, borderRadius: 14, paddingHorizontal: 14, height: 46,
    borderWidth: 1, borderColor: COLORS.border,
  },
  searchInput: { flex: 1, fontSize: 13, color: COLORS.text },

  // Section header
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline',
    paddingHorizontal: 22, marginTop: 18, marginBottom: 8,
  },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text, letterSpacing: -0.2 },
  sectionCount: { fontSize: 11, color: COLORS.subtext, fontWeight: '600' },

  // Grid
  grid: { paddingHorizontal: 13 },
  row: { flexDirection: 'row' },

  // Empty
  empty: { alignItems: 'center', marginTop: 40, paddingHorizontal: 24, width: '100%' },
  emptyIcon: { fontSize: 36, marginBottom: 10 },
  emptyText: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  emptyHint: { fontSize: 12, color: COLORS.subtext, marginTop: 4 },
});
