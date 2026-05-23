import React from 'react';
import { View } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Line } from 'react-native-svg';
import { COLORS } from '../../constants/colors';

// Lightweight SVG sparkline. Pass an array of numbers (price points).
// We compute a smooth path + a translucent area fill underneath. Used
// as the hero visual on StockDetail to replace a raw data table.
export default function Sparkline({
  data = [],
  width = 320,
  height = 96,
  color,
  positive,
}) {
  if (!data || data.length < 2) {
    return <View style={{ width, height }} />;
  }
  const stroke = color || (positive ? COLORS.positive : COLORS.negative);
  const fill   = (positive ? COLORS.positive : COLORS.negative);

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const dx = width / (data.length - 1);

  const points = data.map((v, i) => ({
    x: i * dx,
    y: height - ((v - min) / range) * (height - 8) - 4,
  }));

  const linePath = points
    .map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`))
    .join(' ');

  const areaPath = `${linePath} L${points[points.length - 1].x},${height} L0,${height} Z`;

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={fill} stopOpacity={0.22} />
          <Stop offset="1" stopColor={fill} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      {/* baseline */}
      <Line x1="0" y1={height - 1} x2={width} y2={height - 1} stroke={COLORS.hairline} strokeWidth={0.5} />
      <Path d={areaPath} fill="url(#sparkFill)" />
      <Path d={linePath} stroke={stroke} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
