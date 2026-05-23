import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';

export default function OfflineNotice({ message = 'Connect to see live market data' }) {
  return (
    <View style={styles.wrap}>
      <Ionicons name="cloud-offline-outline" size={16} color={COLORS.warning} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FAEADC', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: 'rgba(217,122,58,0.18)',
  },
  text: { fontSize: 11.5, color: COLORS.warning, fontWeight: '700' },
});
