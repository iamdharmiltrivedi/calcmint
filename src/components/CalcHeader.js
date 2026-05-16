import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';

export default function CalcHeader({
  title, subtitle, icon, accent = COLORS.primary, accentSoft = COLORS.primarySoft, onBack,
}) {
  return (
    <View style={styles.wrap}>
      <TouchableOpacity onPress={onBack} style={styles.iconBtn} activeOpacity={0.7}>
        <Ionicons name="arrow-back" size={18} color={COLORS.text} />
      </TouchableOpacity>

      <View style={styles.center}>
        <View style={styles.titleRow}>
          {icon ? (
            <View style={[styles.titleIcon, { backgroundColor: accentSoft }]}>
              <Ionicons name={icon} size={15} color={accent} />
            </View>
          ) : null}
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
        </View>
        {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
      </View>

      <View style={[styles.iconBtn, { opacity: 0 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 18, paddingVertical: 10,
  },
  iconBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border,
    justifyContent: 'center', alignItems: 'center',
  },
  center: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  titleIcon: {
    width: 26, height: 26, borderRadius: 8,
    justifyContent: 'center', alignItems: 'center',
  },
  title: { fontSize: 17, fontWeight: '800', color: COLORS.text, letterSpacing: -0.2 },
  subtitle: {
    fontSize: 11, color: COLORS.subtext, marginTop: 2, marginLeft: 34,
  },
});
