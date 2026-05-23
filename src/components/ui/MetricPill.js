import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, MONO_STYLE } from '../../constants/colors';

// Horizontal "fact" pill — small label above a mono value. Three of
// these line up nicely as a stat strip (P/E, 52W range pos, D/E etc).
export default function MetricPill({ label, value, accent, style }) {
  return (
    <View style={[styles.pill, style]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, accent && { color: accent }]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flex: 1, paddingVertical: 10, paddingHorizontal: 12,
    backgroundColor: COLORS.card, borderRadius: 12,
    borderWidth: 0.5, borderColor: COLORS.hairline,
  },
  label: { fontSize: 10, color: '#888888', fontWeight: '800', letterSpacing: 0.4, textTransform: 'uppercase' },
  value: { ...MONO_STYLE, fontSize: 14, fontWeight: '800', color: COLORS.text, marginTop: 4 },
});
