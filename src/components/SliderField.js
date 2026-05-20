import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, PanResponder } from 'react-native';
import { COLORS, MONO_STYLE } from '../constants/colors';

const TRACK_HEIGHT = 4;
const THUMB_SIZE = 22;
// Wait this long after the last movement before notifying the parent.
// Drag, pause, and release all flush — so a still-moving slider doesn't
// thrash the parent (hero gradient + recalculation) every frame.
const IDLE_DEBOUNCE_MS = 110;

/**
 * Card-style slider with mono numeral value, accent track, hairline border.
 * Props: label, value (display string), range (display hint), v, min, max, step, accent, onChange.
 *
 * Performance: the thumb tracks the finger at 60 fps via local state, but
 * `onChange` is debounced — it only fires after the user pauses or releases.
 */
export default function SliderField({
  label, value, range, v, min, max, step = 1, accent = COLORS.primary, onChange,
}) {
  const [width, setWidth] = useState(0);
  const [liveV, setLiveV] = useState(v);
  const isDraggingRef = useRef(false);

  // When the parent updates v (saved-input load, or post-debounce echo),
  // mirror it locally — unless the user is actively dragging.
  useEffect(() => {
    if (!isDraggingRef.current) setLiveV(v);
  }, [v]);

  const pct = Math.max(0, Math.min(1, (liveV - min) / (max - min)));

  // All gesture-time values live behind a ref so the PanResponder closures
  // (captured on first render) always see the latest props.
  const stateRef = useRef(null);
  stateRef.current = { min, max, step, width, onChange };

  const debounceRef = useRef(null);
  const pendingRef = useRef(null);

  // Clean up any in-flight timer on unmount.
  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => {
        isDraggingRef.current = true;
        processGesture(e.nativeEvent.locationX);
      },
      onPanResponderMove: (e) => processGesture(e.nativeEvent.locationX),
      onPanResponderRelease: () => {
        isDraggingRef.current = false;
        flushPending();
      },
      onPanResponderTerminate: () => {
        isDraggingRef.current = false;
        flushPending();
      },
    }),
  ).current;

  // Defined inside the component but only reads refs / stable setters,
  // so the first-render capture by the PanResponder is fine.
  function processGesture(x) {
    const s = stateRef.current;
    if (s.width <= 0) return;
    const ratio = Math.max(0, Math.min(1, x / s.width));
    const raw = s.min + ratio * (s.max - s.min);
    const stepped = Math.round(raw / s.step) * s.step;
    const next = Math.max(s.min, Math.min(s.max, stepped));
    if (next === pendingRef.current) return;

    pendingRef.current = next;
    setLiveV(next);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(flushPending, IDLE_DEBOUNCE_MS);
  }

  function flushPending() {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    if (pendingRef.current !== null) {
      stateRef.current.onChange?.(pendingRef.current);
      pendingRef.current = null;
    }
  }

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
