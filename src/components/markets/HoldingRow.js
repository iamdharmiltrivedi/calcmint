import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, MONO_STYLE } from '../../constants/colors';
import { formatINR } from '../../utils/formatters';
import Badge from './Badge';

export default function HoldingRow({ metrics, onPress, onLongPress }) {
  const { holding, currentPrice, currentValue, profitLoss, profitLossPercent } = metrics;
  const positive = profitLoss >= 0;
  const color    = positive ? COLORS.positive : COLORS.negative;

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.85}
    >
      <View style={styles.left}>
        <View style={styles.headerRow}>
          <Text style={styles.symbol} numberOfLines={1}>{holding.symbol}</Text>
          <Badge label={holding.type === 'MF' ? 'MF' : (holding.exchange || 'STK')} variant={holding.type === 'MF' ? 'mf' : 'stock'} />
        </View>
        <Text style={styles.name} numberOfLines={1}>{holding.name}</Text>
        <Text style={styles.meta}>{holding.quantity} units · avg {formatINR(holding.buyPrice)}</Text>
      </View>
      <View style={styles.right}>
        <Text style={styles.value}>{formatINR(currentValue)}</Text>
        <View style={[styles.plPill, { backgroundColor: positive ? COLORS.positiveSoft : COLORS.negativeSoft }]}>
          <Ionicons name={positive ? 'caret-up' : 'caret-down'} size={10} color={color} />
          <Text style={[styles.plText, { color }]}>{Math.abs(profitLossPercent).toFixed(2)}%</Text>
        </View>
        <Text style={styles.priceMeta}>@ {formatINR(currentPrice)}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.card, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: 8,
  },
  left:  { flex: 1, minWidth: 0 },
  right: { alignItems: 'flex-end' },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  symbol: { fontSize: 13.5, fontWeight: '800', color: COLORS.text, letterSpacing: -0.2 },
  name:   { fontSize: 11.5, color: COLORS.subtext, fontWeight: '600', marginTop: 2 },
  meta:   { fontSize: 10.5, color: COLORS.faint, marginTop: 2 },
  value:  { ...MONO_STYLE, fontSize: 14, fontWeight: '800', color: COLORS.text },
  plPill: {
    marginTop: 4, flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999,
  },
  plText: { fontSize: 10.5, fontWeight: '800' },
  priceMeta: { ...MONO_STYLE, fontSize: 10, color: COLORS.faint, marginTop: 3 },
});
