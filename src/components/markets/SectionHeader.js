import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS } from '../../constants/colors';

export default function SectionHeader({ title, onMore, moreLabel = 'View all' }) {
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      {onMore && (
        <TouchableOpacity onPress={onMore}>
          <Text style={styles.more}>{moreLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8, marginTop: 18 },
  title: { fontSize: 13, fontWeight: '800', color: COLORS.text, letterSpacing: -0.2 },
  more:  { fontSize: 11, fontWeight: '700', color: COLORS.primary },
});
