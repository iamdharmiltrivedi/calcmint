import React from 'react';
import { TouchableOpacity, StyleSheet, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';

// Floating Action Button. Sits in the bottom-right above the tab bar.
// Pass `bottom` to lift it above safe-area + custom space if needed.
export default function FAB({ icon = 'add', label, onPress, bottom = 24, color = COLORS.primary }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      style={[styles.fab, { bottom, backgroundColor: color }]}
    >
      <Ionicons name={icon} size={22} color="#fff" />
      {label ? <Text style={styles.label}>{label}</Text> : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute', right: 18,
    minWidth: 56, height: 56, paddingHorizontal: 16,
    borderRadius: 28, flexDirection: 'row', alignItems: 'center', gap: 8,
    justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18, shadowRadius: 10, elevation: 6,
  },
  label: { color: '#fff', fontWeight: '800', fontSize: 14, letterSpacing: -0.2 },
});
