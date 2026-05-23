import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, TouchableWithoutFeedback,
  Animated, KeyboardAvoidingView, Platform, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';

const { height: SCREEN_H } = Dimensions.get('window');

// Minimal bottom-sheet built on top of <Modal>. No external deps. Used
// for Quick Add flows so we don't push a whole new screen for a single
// input form.
export default function BottomSheet({ visible, onClose, title, children, maxHeight = SCREEN_H * 0.85 }) {
  const translateY = useRef(new Animated.Value(SCREEN_H)).current;
  const backdrop   = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(translateY, { toValue: 0, duration: 220, useNativeDriver: true }),
        Animated.timing(backdrop,   { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, { toValue: SCREEN_H, duration: 200, useNativeDriver: true }),
        Animated.timing(backdrop,   { toValue: 0,        duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, translateY, backdrop]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.root}>
        <TouchableWithoutFeedback onPress={onClose}>
          <Animated.View style={[styles.backdrop, { opacity: backdrop }]} />
        </TouchableWithoutFeedback>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.kav}>
          <Animated.View
            style={[styles.sheet, { transform: [{ translateY }], maxHeight }]}
          >
            <View style={styles.grabber} />
            <View style={styles.headerRow}>
              <Text style={styles.title}>{title}</Text>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={20} color={COLORS.subtext} />
              </TouchableOpacity>
            </View>
            {children}
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root:     { flex: 1 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(14,26,20,0.45)' },
  kav:      { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 22, borderTopRightRadius: 22,
    paddingHorizontal: 18, paddingBottom: 28, paddingTop: 8,
    borderWidth: 0.5, borderColor: COLORS.hairline,
  },
  grabber: { alignSelf: 'center', width: 38, height: 4, borderRadius: 2, backgroundColor: COLORS.hairline, marginBottom: 10 },
  headerRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingBottom: 10, borderBottomWidth: 0.5, borderBottomColor: COLORS.hairline, marginBottom: 14,
  },
  title: { fontSize: 16, fontWeight: '800', color: COLORS.text, letterSpacing: -0.2 },
});
