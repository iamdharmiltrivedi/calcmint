import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { AppText } from '../typography';

// Illustrated empty state with a clear CTA. Icon background acts as the
// "illustration" — keeps the asset story lean and stays on brand.
export default function EmptyState({
  icon = 'cube-outline',
  emoji,
  title,
  message,
  ctaLabel,
  onCtaPress,
  accent = COLORS.primary,
  style,
}) {
  return (
    <View style={[styles.wrap, style]}>
      <View style={[styles.iconRing, { borderColor: accent + '30' }]}>
        <View style={[styles.iconCore, { backgroundColor: accent + '14' }]}>
          {emoji ? (
            <Text style={{ fontSize: 28 }}>{emoji}</Text>
          ) : (
            <Ionicons name={icon} size={26} color={accent} />
          )}
        </View>
      </View>
      <AppText variant="cardTitle" style={styles.title}>{title}</AppText>
      {message ? (
        <AppText variant="bodySmall" color={COLORS.subtext} style={styles.message}>
          {message}
        </AppText>
      ) : null}
      {ctaLabel && onCtaPress ? (
        <TouchableOpacity
          style={[styles.cta, { backgroundColor: accent }]}
          onPress={onCtaPress}
          activeOpacity={0.85}
        >
          <AppText variant="button" color="#fff">{ctaLabel}</AppText>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 24 },
  iconRing: {
    width: 84, height: 84, borderRadius: 42, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  iconCore: {
    width: 62, height: 62, borderRadius: 31,
    alignItems: 'center', justifyContent: 'center',
  },
  title:   { marginTop: 14, textAlign: 'center' },
  message: { marginTop: 6, textAlign: 'center', maxWidth: 280 },
  cta:     { marginTop: 16, paddingVertical: 12, paddingHorizontal: 22, borderRadius: 12 },
});
