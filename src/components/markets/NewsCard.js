import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { SentimentBadge } from './Badge';

const timeAgo = (ms) => {
  const diff = Date.now() - ms;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
};

const accentFor = (s) =>
  s === 'Positive' ? COLORS.positive : s === 'Negative' ? COLORS.negative : COLORS.faint;

export default function NewsCard({ item, onPress }) {
  return (
    <TouchableOpacity style={[styles.card, { borderLeftColor: accentFor(item.sentiment) }]} activeOpacity={0.9} onPress={onPress}>
      <View style={styles.headerRow}>
        <Text style={styles.source}>{item.source}</Text>
        <Text style={styles.time}>{timeAgo(item.publishedAt)}</Text>
      </View>
      <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
      <Text style={styles.summary} numberOfLines={2}>{item.summary}</Text>
      <View style={styles.footerRow}>
        <SentimentBadge sentiment={item.sentiment} />
        <Ionicons name="chevron-forward" size={14} color={COLORS.faint} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: COLORS.border, borderLeftWidth: 3,
    marginBottom: 10,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  source: { fontSize: 11, fontWeight: '800', color: COLORS.primary, letterSpacing: 0.2 },
  time:   { fontSize: 10.5, color: COLORS.faint, fontWeight: '600' },
  title:  { fontSize: 13.5, fontWeight: '800', color: COLORS.text, marginTop: 6, lineHeight: 18 },
  summary:{ fontSize: 11.5, color: COLORS.subtext, marginTop: 4, lineHeight: 16 },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
});
