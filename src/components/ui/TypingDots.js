import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { COLORS } from '../../constants/colors';

// Three pulsing dots used while the model is generating. We stagger
// each dot's opacity by 200 ms so the indicator reads as "thinking…"
// instead of a uniform pulse.
export default function TypingDots({ color = COLORS.primary, size = 6 }) {
  const dots = [useRef(new Animated.Value(0.3)).current,
                useRef(new Animated.Value(0.3)).current,
                useRef(new Animated.Value(0.3)).current];

  useEffect(() => {
    const loops = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 200),
          Animated.timing(dot, { toValue: 1,   duration: 400, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.3, duration: 400, useNativeDriver: true }),
          Animated.delay(400 - i * 200),
        ]),
      ),
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [dots]);

  return (
    <View style={styles.row}>
      {dots.map((opacity, i) => (
        <Animated.View
          key={i}
          style={[styles.dot, { width: size, height: size, borderRadius: size / 2, backgroundColor: color, opacity }]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: {},
});
