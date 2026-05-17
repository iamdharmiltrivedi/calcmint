import React, { forwardRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, MONO_STYLE } from '../constants/colors';

// A premium-looking card meant to be captured and shared as an image.
// Pass a ref and call captureRef on it.
const ShareableCard = forwardRef(function ShareableCard(
  { title, value, subtitle, rows = [], footer = 'CalcMint · plan, save, grow' },
  ref,
) {
  return (
    <View ref={ref} collapsable={false} style={styles.wrap}>
      <LinearGradient colors={COLORS.gradient} style={styles.card}>
        <View style={styles.orb} />
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.value}>{value}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

        {rows.length > 0 && (
          <View style={styles.rows}>
            {rows.map((r, i) => (
              <View key={i} style={styles.row}>
                <Text style={styles.rowLabel}>{r.label}</Text>
                <Text style={styles.rowValue}>{r.value}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.footer}>
          <View style={styles.brandDot} />
          <Text style={styles.footerText}>{footer}</Text>
        </View>
      </LinearGradient>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { width: 340, padding: 12, backgroundColor: 'transparent' },
  card: {
    borderRadius: 24, padding: 22, overflow: 'hidden',
  },
  orb: {
    position: 'absolute', right: -60, bottom: -60,
    width: 220, height: 220, borderRadius: 110,
    backgroundColor: 'rgba(201,162,74,0.25)',
  },
  title: { color: 'rgba(255,255,255,0.65)', fontSize: 11, fontWeight: '700', letterSpacing: 1.4 },
  value: { ...MONO_STYLE, color: '#fff', fontSize: 30, fontWeight: '800', marginTop: 6, letterSpacing: -0.6 },
  subtitle: { color: 'rgba(255,255,255,0.78)', fontSize: 13, marginTop: 8, lineHeight: 19 },

  rows: {
    marginTop: 18, paddingTop: 14,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.14)', gap: 8,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  rowLabel: { color: 'rgba(255,255,255,0.65)', fontSize: 12, fontWeight: '600' },
  rowValue: { ...MONO_STYLE, color: '#fff', fontSize: 13, fontWeight: '700' },

  footer: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 20, paddingTop: 14,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.14)',
  },
  brandDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.gold },
  footerText: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '700', letterSpacing: 0.4 },
});

export default ShareableCard;
