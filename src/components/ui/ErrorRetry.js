import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';

const ago = (ms) => {
  if (!ms) return 'never';
  const diff = Date.now() - ms;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
};

// Network error block — shows the last successful timestamp so users
// know they're seeing stale (not stuck) data, plus a retry button.
export default function ErrorRetry({
  title = 'Couldn’t reach the network',
  message = 'Showing the last data we have.',
  lastSuccessAt,
  onRetry,
}) {
  return (
    <View style={styles.wrap}>
      <View style={styles.iconBox}>
        <Ionicons name="cloud-offline-outline" size={18} color={COLORS.warning} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>
          {message} {lastSuccessAt ? `Last updated ${ago(lastSuccessAt)}.` : ''}
        </Text>
      </View>
      {onRetry ? (
        <TouchableOpacity style={styles.retry} onPress={onRetry} activeOpacity={0.85}>
          <Ionicons name="refresh" size={13} color={COLORS.primary} />
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FDF1DA', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 0.5, borderColor: 'rgba(239,159,39,0.3)',
  },
  iconBox: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  title:   { fontSize: 12.5, fontWeight: '800', color: COLORS.text },
  message: { fontSize: 11, color: COLORS.subtext, marginTop: 2, lineHeight: 15 },
  retry:   { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: COLORS.primarySoft, borderRadius: 8 },
  retryText: { color: COLORS.primary, fontWeight: '800', fontSize: 11.5 },
});
