import React from 'react';
import { TouchableOpacity, StyleSheet, ActivityIndicator, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { AppText } from './typography';

const PrimaryButton = ({
  title, onPress, loading = false, disabled = false, gradient, style,
  variant = 'ink', // 'ink' (flat dark) or 'gradient'
  iconRight,
}) => {
  const Inner = (
    <View style={styles.innerRow}>
      {loading ? (
        <ActivityIndicator color="#fff" size="small" />
      ) : (
        <>
          <AppText variant="button" color="#fff" style={styles.label}>{title}</AppText>
          {iconRight ? (
            <Ionicons name={iconRight} size={16} color="#fff" />
          ) : null}
        </>
      )}
    </View>
  );

  if (variant === 'gradient' || gradient) {
    const colors = disabled ? ['#9CA3AF', '#6B7280'] : (gradient || COLORS.gradient);
    return (
      <TouchableOpacity
        onPress={onPress} disabled={disabled || loading} activeOpacity={0.85}
        style={[styles.wrapper, style]}
      >
        <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.gradient}>
          {Inner}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress} disabled={disabled || loading} activeOpacity={0.85}
      style={[styles.wrapper, styles.inkBtn, disabled && { backgroundColor: '#6B7280' }, style]}
    >
      {Inner}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 16, overflow: 'hidden',
    ...COLORS.shadowSoft,
  },
  inkBtn: {
    backgroundColor: COLORS.text,
    height: 54, justifyContent: 'center', alignItems: 'center',
  },
  gradient: {
    height: 54, justifyContent: 'center', alignItems: 'center',
  },
  innerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  label: { letterSpacing: 0.2 },
});

export default PrimaryButton;
