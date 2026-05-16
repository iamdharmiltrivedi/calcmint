import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, StatusBar, TextInput, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, MONO_STYLE } from '../constants/colors';
import { CALCULATORS } from '../constants/calculatorData';
import CalculatorCard from '../components/CalculatorCard';
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

      {/* Top bar — brand only (no notifications, no profile) */}
      <View style={styles.topBar}>
        <View style={styles.brandRow}>
          <Image
            source={require('../../assets/icon.png')}
            style={styles.brandMark}
            resizeMode="cover"
          />
          <View>
            <Text style={styles.brandName}>CalcMint</Text>
            <Text style={styles.brandTagline}>Plan · Save · Grow</Text>
          </View>
        </View>
        <View style={styles.iconBtnRow}>
          <TouchableOpacity style={styles.iconBtn} activeOpacity={0.7}>
            <Ionicons name="search" size={17} color={COLORS.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} activeOpacity={0.7}>
            <Ionicons name="settings-outline" size={17} color={COLORS.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Hero — emerald gradient brand statement (no fake portfolio data) */}
        <View style={styles.heroWrap}>
          <LinearGradient
            colors={COLORS.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.7, y: 1 }}
            style={styles.hero}
          >
            {/* Soft gold orb */}
            <View style={styles.heroOrb} />

            <View style={styles.offlinePill}>
              <View style={styles.offlineDot} />
              <Text style={styles.offlinePillText}>OFFLINE · PRIVATE</Text>
            </View>

            <Text style={styles.heroTitle}>
              Smart money tools,{'\n'}
              <Text style={{ color: COLORS.gold }}>right in your pocket.</Text>
            </Text>
            <Text style={styles.heroSub}>
              10 calculators · Indian formats · zero ads · zero tracking.
            </Text>

            <View style={styles.heroStats}>
              <MiniStat label="Calculators" value="10" />
              <MiniStat label="Currency" value="₹ INR" />
              <MiniStat label="Works" value="Offline" />
            </View>
          </LinearGradient>
        </View>

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
            // chunk into rows of 3 so flex:1 in cards still works
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
                {/* fill row to 3 cells if last row is short, so widths stay aligned */}
                {Array.from({
                  length: 3 - filtered.slice(rowIdx * 3, rowIdx * 3 + 3).length,
                }).map((__, i) => (
                  <View key={`filler-${i}`} style={{ flex: 1, margin: 5 }} />
                ))}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function MiniStat({ label, value }) {
  return (
    <View>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },

  // Top bar
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingTop: 6, paddingBottom: 6,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandMark: { width: 36, height: 36, borderRadius: 11 },
  brandName: { fontSize: 15, fontWeight: '800', color: COLORS.text, letterSpacing: -0.2 },
  brandTagline: { fontSize: 10.5, color: COLORS.subtext, fontWeight: '600', marginTop: 1 },
  iconBtnRow: { flexDirection: 'row', gap: 8 },
  iconBtn: {
    width: 38, height: 38, borderRadius: 12, backgroundColor: COLORS.card,
    borderWidth: 1, borderColor: COLORS.border,
    justifyContent: 'center', alignItems: 'center',
  },

  body: { paddingBottom: 28 },

  // Hero
  heroWrap: { marginHorizontal: 18, marginTop: 10 },
  hero: {
    borderRadius: 24, padding: 20, overflow: 'hidden', position: 'relative',
  },
  heroOrb: {
    position: 'absolute', right: -60, top: -60,
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(201,162,74,0.30)',
  },
  offlinePill: {
    alignSelf: 'flex-start',
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(201,162,74,0.18)',
    borderWidth: 1, borderColor: 'rgba(201,162,74,0.45)',
    paddingHorizontal: 9, paddingVertical: 4,
    borderRadius: 999,
  },
  offlineDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: COLORS.gold },
  offlinePillText: { fontSize: 9.5, fontWeight: '700', color: COLORS.gold, letterSpacing: 0.8 },
  heroTitle: {
    fontSize: 24, fontWeight: '800', color: '#fff',
    letterSpacing: -0.5, lineHeight: 30, marginTop: 14,
  },
  heroSub: {
    fontSize: 12, color: 'rgba(255,255,255,0.72)', marginTop: 8, lineHeight: 18,
  },
  heroStats: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginTop: 16, paddingTop: 14,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.12)',
  },
  statLabel: {
    fontSize: 9.5, color: 'rgba(255,255,255,0.55)', fontWeight: '600',
    letterSpacing: 0.4, textTransform: 'uppercase',
  },
  statValue: {
    ...MONO_STYLE,
    fontSize: 14, fontWeight: '700', color: '#fff', marginTop: 3,
  },

  // Continue strip
  continueCard: {
    marginHorizontal: 18, marginTop: 14,
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
