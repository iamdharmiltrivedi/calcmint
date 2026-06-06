import React from 'react';
import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { AppText } from './typography';

// Consistent top-of-screen brand for all tab-level screens.
// Right side accepts up to two icon buttons (e.g. search + settings).
export default function BrandHeader({ rightActions = [] }) {
  return (
    <View style={styles.topBar}>
      <View style={styles.brandRow}>
        <Image
          source={require('../../assets/icon.png')}
          style={styles.brandMark}
          resizeMode="cover"
        />
        <View>
          <AppText variant="cardTitle" style={styles.brandName}>CalcMint</AppText>
          <AppText variant="caption" color={COLORS.subtext} style={styles.brandTagline}>Plan · Save · Grow</AppText>
        </View>
      </View>
      {rightActions.length > 0 ? (
        <View style={styles.iconBtnRow}>
          {rightActions.map((a, i) => (
            <TouchableOpacity
              key={i}
              onPress={a.onPress}
              style={styles.iconBtn}
              activeOpacity={0.7}
              accessibilityLabel={a.label}
            >
              <Ionicons name={a.icon} size={17} color={COLORS.text} />
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 6,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandMark: { width: 36, height: 36, borderRadius: 11 },
  brandName: { letterSpacing: -0.2 },
  brandTagline: { marginTop: 1 },
  iconBtnRow: { flexDirection: 'row', gap: 8 },
  iconBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border,
    justifyContent: 'center', alignItems: 'center',
  },
});
