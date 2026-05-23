import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { COLORS } from '../../constants/colors';

// Single shimmer rectangle. Compose multiple to fake list/card layouts.
export default function Skeleton({ width = '100%', height = 14, radius = 8, style }) {
  const opacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1,   duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        { width, height, borderRadius: radius, backgroundColor: '#E8EBE7', opacity },
        style,
      ]}
    />
  );
}

export function SkeletonRow({ count = 3 }) {
  return (
    <View style={{ gap: 10 }}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.row}>
          <Skeleton width={36} height={36} radius={10} />
          <View style={{ flex: 1, gap: 6 }}>
            <Skeleton width="65%" height={12} />
            <Skeleton width="40%" height={10} />
          </View>
          <Skeleton width={60} height={14} />
        </View>
      ))}
    </View>
  );
}

export function SkeletonCard({ height = 100 }) {
  return (
    <View style={styles.card}>
      <Skeleton width="40%" height={11} />
      <View style={{ height: 8 }} />
      <Skeleton width="70%" height={20} />
      <View style={{ height: 8 }} />
      <Skeleton width="100%" height={8} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.card, borderRadius: 12, padding: 14,
    borderWidth: 0.5, borderColor: COLORS.hairline,
  },
  card: {
    backgroundColor: COLORS.card, borderRadius: 12, padding: 16,
    borderWidth: 0.5, borderColor: COLORS.hairline,
  },
});
