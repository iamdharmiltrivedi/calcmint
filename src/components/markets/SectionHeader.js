import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS } from '../../constants/colors';
import { AppText } from '../typography';

export default function SectionHeader({ title, onMore, moreLabel = 'View all' }) {
  return (
    <View style={styles.row}>
      <AppText variant="cardTitle" style={styles.title}>{title}</AppText>
      {onMore && (
        <TouchableOpacity onPress={onMore}>
          <AppText variant="label" color={COLORS.primary}>{moreLabel}</AppText>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8, marginTop: 18 },
  title: { letterSpacing: -0.2 },
});
