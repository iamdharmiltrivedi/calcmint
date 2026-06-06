import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { AppText, AppNumber, CurrencyText } from '../typography';
import { FONT_FAMILIES } from '../../theme/fonts';
import Badge from './Badge';

export default function HoldingRow({ metrics, onPress, onLongPress }) {
  const {
    holding, currentPrice, currentValue, profitLoss, profitLossPercent,
    dayChangePercent = 0, hasLivePrice = false,
  } = metrics;

  const totalPositive = profitLoss >= 0;
  const totalColor    = totalPositive ? COLORS.positive : COLORS.negative;

  const dayPositive = dayChangePercent >= 0;
  const dayColor    = dayPositive ? COLORS.positive : COLORS.negative;

  const priceLabel = holding.type === 'MF' ? 'NAV' : 'LTP';

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.85}
    >
      <View style={styles.left}>
        <View style={styles.headerRow}>
          <AppText variant="bodySmall" style={styles.symbol} numberOfLines={1} ellipsizeMode="tail">
            {holding.type === 'MF' ? holding.name : holding.symbol}
          </AppText>
          <Badge
            label={holding.type === 'MF' ? 'MF' : (holding.exchange || 'STK')}
            variant={holding.type === 'MF' ? 'mf' : 'stock'}
          />
        </View>
        <AppText variant="caption" color={COLORS.subtext} style={styles.name} numberOfLines={1}>
          {holding.type === 'MF' ? `Scheme ${holding.symbol}` : holding.name}
        </AppText>
        <AppText variant="caption" color={COLORS.faint} style={styles.meta}>
          {holding.quantity} units · avg ₹{Number(holding.buyPrice || 0).toFixed(2)}
        </AppText>
        <View style={styles.priceLine}>
          <AppText variant="caption" color={COLORS.faint} style={styles.priceLabel}>{priceLabel}</AppText>
          <CurrencyText value={currentPrice} size="small" />
          {hasLivePrice ? (
            <View style={[styles.dayPill, { backgroundColor: dayPositive ? COLORS.positiveSoft : COLORS.negativeSoft }]}>
              <Ionicons name={dayPositive ? 'caret-up' : 'caret-down'} size={9} color={dayColor} />
              <AppNumber size="small" color={dayColor} style={styles.dayText}>
                {Math.abs(dayChangePercent).toFixed(2)}%
              </AppNumber>
            </View>
          ) : (
            <AppNumber size="small" color={COLORS.faint}>—</AppNumber>
          )}
        </View>
      </View>
      <View style={styles.right}>
        <CurrencyText value={currentValue} size="medium" style={styles.value} />
        <View style={[styles.plPill, { backgroundColor: totalPositive ? COLORS.positiveSoft : COLORS.negativeSoft }]}>
          <Ionicons name={totalPositive ? 'caret-up' : 'caret-down'} size={10} color={totalColor} />
          <AppNumber size="small" color={totalColor} style={styles.plPct}>
            {Math.abs(profitLossPercent).toFixed(2)}%
          </AppNumber>
        </View>
        <CurrencyText
          value={profitLoss}
          signed
          size="small"
          color={totalColor}
          style={styles.plAbs}
        />
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
  right: { alignItems: 'flex-end', flexShrink: 0 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  symbol: { flexShrink: 1, letterSpacing: -0.2, fontSize: 14, fontFamily: FONT_FAMILIES.interSemiBold },
  value:  { fontSize: 15, lineHeight: 20 },
  name:   { marginTop: 2 },
  meta:   { marginTop: 2 },
  priceLine: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  priceLabel: { letterSpacing: 0.5, fontSize: 10 },
  dayPill: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    paddingHorizontal: 6, paddingVertical: 1.5, borderRadius: 999,
  },
  dayText: { fontSize: 11 },
  plPill: {
    marginTop: 4, flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999,
  },
  plPct: { fontSize: 11 },
  plAbs: { marginTop: 3 },
});
