import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, PanResponder } from 'react-native';
import { COLORS, MONO_STYLE } from '../constants/colors';

const TRACK_HEIGHT = 4;
const THUMB_SIZE = 22;

/**
 * Card-style slider with mono numeral value, accent track, hairline border.
 * Props: label, value (display string), range (display hint), v, min, max, step, accent, onChange.
 */
export default function SliderField({
  label, value, range, v, min, max, step = 1, accent = COLORS.primary, onChange,
}) {
  const [width, setWidth] = useState(0);
  const pct = Math.max(0, Math.min(1, (v - min) / (max - min)));

  // Convert a screen-x position to a stepped value
  const fromX = (x) => {
    if (width <= 0) return v;
    const ratio = Math.max(0, Math.min(1, x / width));
    const raw = min + ratio * (max - min);
    const stepped = Math.round(raw / step) * step;
    return Math.max(min, Math.min(max, stepped));
  };

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => onChange?.(fromX(e.nativeEvent.locationX)),
      onPanResponderMove: (e) => onChange?.(fromX(e.nativeEvent.locationX)),
    }),
  ).current;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.value}>{value}</Text>
        </View>
        {range ? <Text style={styles.range}>{range}</Text> : null}
      </View>

      <View
        style={styles.trackArea}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        {...responder.panHandlers}
      >
        <View style={styles.trackBg} />
        <View style={[styles.trackFill, { width: `${pct * 100}%`, backgroundColor: accent }]} />
        <View
          style={[
            styles.thumb,
            {
              left: Math.max(0, pct * width - THUMB_SIZE / 2),
              borderColor: accent,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...COLORS.shadowSoft,
  },
  headerRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
  },
  label: {
    fontSize: 10.5, color: COLORS.subtext, fontWeight: '700',
    letterSpacing: 0.4, textTransform: 'uppercase',
  },
  value: {
    ...MONO_STYLE,
    fontSize: 22, fontWeight: '700', color: COLORS.text, marginTop: 4, letterSpacing: -0.5,
  },
  range: { fontSize: 10, color: COLORS.faint, fontWeight: '600' },
  trackArea: {
    height: 30, marginTop: 10, justifyContent: 'center', position: 'relative',
  },
  trackBg: {
    position: 'absolute', left: 0, right: 0, top: (30 - TRACK_HEIGHT) / 2,
    height: TRACK_HEIGHT, borderRadius: 999, backgroundColor: COLORS.background,
  },
  trackFill: {
    position: 'absolute', left: 0, top: (30 - TRACK_HEIGHT) / 2,
    height: TRACK_HEIGHT, borderRadius: 999,
  },
  thumb: {
    position: 'absolute', top: (30 - THUMB_SIZE) / 2,
    width: THUMB_SIZE, height: THUMB_SIZE, borderRadius: THUMB_SIZE / 2,
    backgroundColor: '#fff', borderWidth: 2,
    ...COLORS.shadowSoft,
  },
});
