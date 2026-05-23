import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';

// Reusable screen header for any pushed screen. Always shows a back
// arrow and the parent tab name + screen title, matching the global
// nav guidance. Right slot accepts icon buttons.
export default function ScreenHeader({
  title,
  parent,
  onBack,
  right = [],
  flat = false,
}) {
  return (
    <View style={[styles.bar, flat && styles.barFlat]}>
      {onBack ? (
        <TouchableOpacity onPress={onBack} style={styles.iconBtn} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
          <Ionicons name="chevron-back" size={20} color={COLORS.text} />
        </TouchableOpacity>
      ) : (
        <View style={{ width: 38 }} />
      )}
      <View style={styles.titleCol}>
        {parent ? <Text style={styles.parent}>{parent}</Text> : null}
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
      </View>
      <View style={styles.rightRow}>
        {right.map((r, i) => (
          <TouchableOpacity key={i} style={styles.iconBtn} onPress={r.onPress}>
            <Ionicons name={r.icon} size={17} color={COLORS.text} />
          </TouchableOpacity>
        ))}
        {right.length === 0 && <View style={{ width: 38 }} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 6,
    backgroundColor: COLORS.background,
  },
  barFlat: { backgroundColor: 'transparent' },
  iconBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: COLORS.card, borderWidth: 0.5, borderColor: COLORS.hairline,
    justifyContent: 'center', alignItems: 'center',
  },
  titleCol: { flex: 1, alignItems: 'center' },
  parent: { fontSize: 10.5, color: COLORS.subtext, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' },
  title:  { fontSize: 14.5, fontWeight: '800', color: COLORS.text, letterSpacing: -0.2, marginTop: 1 },
  rightRow: { flexDirection: 'row', gap: 6 },
});
