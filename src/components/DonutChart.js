import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { formatINR } from '../utils/formatters';

// Convert polar angle to (x,y) cartesian coordinate on a circle
const polar = (cx, cy, r, angleDeg) => {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
};

// Build an SVG donut-arc path from startAngle to endAngle
const arc = (cx, cy, outerR, innerR, start, end) => {
  // small gap between segments for visual separation
  const GAP = 1.5;
  const s = start + GAP;
  const e = end - GAP;
  if (e - s <= 0) return '';
  const large = e - s > 180 ? 1 : 0;
  const os = polar(cx, cy, outerR, s);
  const oe = polar(cx, cy, outerR, e);
  const ie = polar(cx, cy, innerR, e);
  const is_ = polar(cx, cy, innerR, s);
  return [
    `M ${os.x} ${os.y}`,
    `A ${outerR} ${outerR} 0 ${large} 1 ${oe.x} ${oe.y}`,
    `L ${ie.x} ${ie.y}`,
    `A ${innerR} ${innerR} 0 ${large} 0 ${is_.x} ${is_.y}`,
    'Z',
  ].join(' ');
};

const DonutChart = ({
  data = [],          // [{ label, value, color }]
  size = 210,
  centerLabel,
  centerValue,        // number → auto-formatted as INR
}) => {
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size * 0.42;
  const innerR = size * 0.28;

  const total = data.reduce((s, d) => s + (d.value || 0), 0);
  if (total <= 0) return null;

  let cursor = 0;
  const segments = data.map((d) => {
    const sweep = (d.value / total) * 360;
    const seg = { ...d, start: cursor, end: cursor + sweep };
    cursor += sweep;
    return seg;
  });

  return (
    <View style={styles.wrap}>
      <View>
        <Svg width={size} height={size}>
          {segments.map((seg, i) => (
            <Path
              key={i}
              d={arc(cx, cy, outerR, innerR, seg.start, seg.end)}
              fill={seg.color}
            />
          ))}
          {/* White inner circle to punch the hole */}
          <Circle cx={cx} cy={cy} r={innerR - 3} fill="#fff" />
        </Svg>

        {/* Center text overlay — positioned absolutely over SVG */}
        {centerValue !== undefined && (
          <View
            style={[styles.centerBox, { width: size, height: size }]}
            pointerEvents="none"
          >
            <Text style={styles.centerVal}>{formatINR(centerValue)}</Text>
            {centerLabel ? (
              <Text style={styles.centerLbl}>{centerLabel}</Text>
            ) : null}
          </View>
        )}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        {data.map((item, i) => (
          <View key={i} style={styles.legendRow}>
            <View style={[styles.dot, { backgroundColor: item.color }]} />
            <Text style={styles.legendLabel}>{item.label}</Text>
            <Text style={styles.legendPct}>
              {Math.round((item.value / total) * 100)}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: 8 },
  centerBox: {
    position: 'absolute',
    top: 0,
    left: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerVal: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1C1C1E',
    textAlign: 'center',
  },
  centerLbl: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2,
    textAlign: 'center',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginTop: 10,
  },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 9, height: 9, borderRadius: 5 },
  legendLabel: { fontSize: 12, color: '#6B7280' },
  legendPct: { fontSize: 12, fontWeight: '700', color: '#1C1C1E' },
});

export default DonutChart;
