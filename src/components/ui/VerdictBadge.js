import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';

const TONE = {
  BUY:  { bg: COLORS.buy,  ic: 'arrow-up-circle',   label: 'BUY'  },
  HOLD: { bg: COLORS.hold, ic: 'remove-circle',     label: 'HOLD' },
  SELL: { bg: COLORS.sell, ic: 'arrow-down-circle', label: 'SELL' },
};

// Large, color-coded verdict pill — readable in under a second. Used
// at the top of StockDetail so the recommendation is the first thing
// the eye lands on.
export default function VerdictBadge({ verdict = 'HOLD', confidence }) {
  const t = TONE[verdict] || TONE.HOLD;
  return (
    <View style={[styles.pill, { backgroundColor: t.bg }]}>
      <Ionicons name={t.ic} size={20} color="#fff" />
      <Text style={styles.label}>{t.label}</Text>
      {typeof confidence === 'number' ? (
        <Text style={styles.conf}>· {Math.round(confidence)}% confidence</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 999,
  },
  label: { color: '#fff', fontWeight: '900', fontSize: 16, letterSpacing: 0.8 },
  conf:  { color: 'rgba(255,255,255,0.85)', fontWeight: '700', fontSize: 11.5 },
});
