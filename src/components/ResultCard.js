import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../constants/colors';
import { formatINR } from '../utils/formatters';

// data = [{ label, value, color? }]   value can be number (auto-formatINR) or string
const ResultCard = ({ data = [], accentColor }) => (
  <View style={[styles.card, { borderTopColor: accentColor || COLORS.primary }]}>
    <View style={styles.row}>
      {data.map((item, idx) => (
        <View
          key={idx}
          style={[styles.cell, idx < data.length - 1 && styles.cellBorder]}
        >
          <Text style={styles.cellLabel}>{item.label}</Text>
          <Text style={[styles.cellValue, item.color ? { color: item.color } : null]}>
            {typeof item.value === 'number' ? formatINR(item.value) : item.value}
          </Text>
        </View>
      ))}
    </View>
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
    borderTopWidth: 4,
    marginTop: 14,
    ...COLORS.shadow,
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    flex: 1,
    alignItems: 'center',
  },
  cellBorder: {
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },
  cellLabel: {
    fontSize: 10,
    color: COLORS.subtext,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    textAlign: 'center',
    marginBottom: 6,
  },
  cellValue: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
  },
});

export default ResultCard;
