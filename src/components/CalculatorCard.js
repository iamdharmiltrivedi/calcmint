import React, { useEffect, useRef } from 'react';
import { TouchableOpacity, View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';

const CalculatorCard = ({ item, onPress, index = 0 }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translate = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1, duration: 380, delay: index * 50, useNativeDriver: true,
      }),
      Animated.timing(translate, {
        toValue: 0, duration: 380, delay: index * 50, useNativeDriver: true,
      }),
    ]).start();
  }, [index, opacity, translate]);

  return (
    <Animated.View style={{ flex: 1, opacity, transform: [{ translateY: translate }] }}>
      <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
        <View style={[styles.iconBox, { backgroundColor: item.softColor || (item.color + '20') }]}>
          <Ionicons name={item.icon} size={20} color={item.color} />
        </View>
        <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.description} numberOfLines={1}>{item.description}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 12,
    margin: 5,
    minHeight: 102,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...COLORS.shadowSoft,
  },
  iconBox: {
    width: 38, height: 38, borderRadius: 11,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 12.5,
    fontWeight: '700',
    color: COLORS.text,
    lineHeight: 16,
  },
  description: {
    fontSize: 10,
    color: COLORS.subtext,
    marginTop: 3,
    lineHeight: 13,
  },
});

export default CalculatorCard;
