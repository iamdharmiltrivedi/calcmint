import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../../constants/colors';

const VARIANTS = {
  buy:      { fg: '#fff',          bg: COLORS.buy },
  hold:     { fg: '#fff',          bg: COLORS.hold },
  sell:     { fg: '#fff',          bg: COLORS.sell },
  positive: { fg: COLORS.positive, bg: COLORS.positiveSoft },
  negative: { fg: COLORS.negative, bg: COLORS.negativeSoft },
  neutral:  { fg: COLORS.subtext,  bg: 'rgba(14,26,20,0.06)' },
  stock:    { fg: COLORS.primary,  bg: COLORS.primarySoft },
  mf:       { fg: COLORS.gold,     bg: COLORS.goldSoft },
  ghost:    { fg: COLORS.text,     bg: 'rgba(14,26,20,0.06)' },
};

export default function Badge({ label, variant = 'neutral', style }) {
  const v = VARIANTS[variant] || VARIANTS.neutral;
  return (
    <View style={[styles.pill, { backgroundColor: v.bg }, style]}>
      <Text style={[styles.label, { color: v.fg }]}>{label}</Text>
    </View>
  );
}

export const RecommendationBadge = ({ rec }) => {
  const v = rec === 'BUY' ? 'buy' : rec === 'SELL' ? 'sell' : 'hold';
  return <Badge label={rec} variant={v} />;
};

export const SentimentBadge = ({ sentiment }) => {
  const v = sentiment === 'Positive' ? 'positive' : sentiment === 'Negative' ? 'negative' : 'neutral';
  return <Badge label={sentiment} variant={v} />;
};

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 999, alignSelf: 'flex-start',
  },
  label: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.4 },
});
