import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Svg, { Rect, Text as SvgText, Line } from 'react-native-svg';
import { formatCompact } from '../utils/formatters';
import { COLORS } from '../constants/colors';

// data = [{ label: string, value: number }]
const BarChartComponent = ({
  data = [],
  title,
  color = COLORS.primary,
  height = 180,
}) => {
  if (!data.length) return null;

  const BAR_W = 22;
  const BAR_GAP = 14;
  const PADDING_LEFT = 40;
  const PADDING_BOTTOM = 24;
  const plotH = height - PADDING_BOTTOM;
  const chartW = PADDING_LEFT + data.length * (BAR_W + BAR_GAP) + BAR_GAP;
  const maxVal = Math.max(...data.map((d) => d.value), 1);

  // 4 horizontal grid lines
  const gridLines = [0.25, 0.5, 0.75, 1].map((p) => ({
    y: plotH - plotH * p,
    label: formatCompact(maxVal * p),
  }));

  return (
    <View style={styles.wrapper}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <Svg width={Math.max(chartW, 300)} height={height}>
          {/* Grid lines */}
          {gridLines.map((gl, i) => (
            <React.Fragment key={i}>
              <Line
                x1={PADDING_LEFT}
                y1={gl.y}
                x2={Math.max(chartW, 300)}
                y2={gl.y}
                stroke={COLORS.border}
                strokeWidth={0.8}
                strokeDasharray="4 3"
              />
              <SvgText
                x={PADDING_LEFT - 4}
                y={gl.y + 4}
                fontSize="9"
                fill={COLORS.subtext}
                textAnchor="end"
              >
                {gl.label}
              </SvgText>
            </React.Fragment>
          ))}

          {/* Bars */}
          {data.map((item, i) => {
            const barH = Math.max(2, (item.value / maxVal) * (plotH - 10));
            const x = PADDING_LEFT + i * (BAR_W + BAR_GAP) + BAR_GAP;
            const y = plotH - barH;
            return (
              <React.Fragment key={i}>
                <Rect
                  x={x}
                  y={y}
                  width={BAR_W}
                  height={barH}
                  fill={color}
                  rx={4}
                  opacity={0.88}
                />
                <SvgText
                  x={x + BAR_W / 2}
                  y={height - 6}
                  fontSize="9"
                  fill={COLORS.subtext}
                  textAnchor="middle"
                >
                  {item.label}
                </SvgText>
              </React.Fragment>
            );
          })}
        </Svg>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
    ...COLORS.shadow,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 10,
  },
});

export default BarChartComponent;
